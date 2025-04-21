const g_productionLineSelect = document.getElementById('productionLineSelect');
const g_productNameSelect = document.getElementById('productNameSelect');
const g_submitButton = document.getElementById('submitButton');
const g_dateOptionsContainer = document.getElementById('dateOptions');

let g_lastReceivedDataCache = null;
let g_lastSettings = null;
let g_currentVersion = null;
let g_updateCheckFrequency = 3600; // Default value in seconds
let g_lastUpdateCheckTime = 0;
let g_pendingUpdates = false;

// Function to format date as YYYY-MM-DD (Weekday)
function formatDateWithWeekday(date) {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const weekday = days[date.getDay()];
    return `${day}-${month}-${year} (${weekday})`;
    // End of formatDateWithWeekday
}

// Set up date radio buttons
function setupDateSelection() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Clear any existing options
    g_dateOptionsContainer.innerHTML = '';
    
    // Add yesterday option
    const yesterdayOption = document.createElement('div');
    yesterdayOption.className = 'radio-option';
    yesterdayOption.innerHTML = `
        <input type="radio" name="productionDate" value="${formatDate(yesterday)}" id="yesterdayDate">
        <label for="yesterdayDate">${formatDateWithWeekday(yesterday)}</label>
    `;
    g_dateOptionsContainer.appendChild(yesterdayOption);
    
    // Add today option
    const todayOption = document.createElement('div');
    todayOption.className = 'radio-option';
    todayOption.innerHTML = `
        <input type="radio" name="productionDate" value="${formatDate(today)}" id="todayDate" checked>
        <label for="todayDate">${formatDateWithWeekday(today)}</label>
    `;
    g_dateOptionsContainer.appendChild(todayOption);
    
    // Helper function to format date for value attribute (without weekday)
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${day}-${month}-${year}`;
        // End of formatDate
    }
    // End of setupDateSelection
}

// Load settings
const loadSettings = async () => {
    try {
        const response = await fetch("/settings.json");
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const settings = await response.json();
        
        console.log('loadSettingsFile');
        console.log('Settings loaded:', settings);

        if(g_currentVersion !== null && g_currentVersion !== settings.ver) {
            console.log("Version changed from", g_currentVersion, "to", settings.ver);  
            g_pendingUpdates = true;
        }

        // Extract the values from settings.json
        g_currentVersion = settings.ver;
        g_updateCheckFrequency = parseInt(settings["update check frequency"]) || 3600;
        const checkFillingAuthority = settings["check filling authority"] === "yes";

        // Update UI with version information
        const versionInfoElement = document.getElementById("versionInfo");
        if (versionInfoElement) {
            versionInfoElement.textContent = `ver: ${g_currentVersion}`;
        }

        // Update the filling authority check status
        g_isCheckingFillingAuthority = checkFillingAuthority;
        console.log("isCheckingFillingAuthority is ", g_isCheckingFillingAuthority ? "true" : "false");

        return {
            success: true,
            version: g_currentVersion,
            checkFrequency: g_updateCheckFrequency,
            checkFillingAuthority: g_isCheckingFillingAuthority
        };
    } catch (error) {
        console.error("Failed to load or parse the settings file:", error);
        
        // Fallback to default values
        g_currentVersion = "2025.4.19.1";
        g_updateCheckFrequency = 3600;
        g_isCheckingFillingAuthority = false;

        return {
            success: false,
            error: error.message,
            version: g_currentVersion,
            checkFrequency: g_updateCheckFrequency,
            checkFillingAuthority: g_isCheckingFillingAuthority
        };
    }
    // End of loadSettings
};

document.addEventListener("DOMContentLoaded", () => {
    setupDateSelection();    

    const loadExcelFile = async () => {
        try {
            const response = await fetch("/label_library.xlsx");
            const arrayBuffer = await response.arrayBuffer();
    
            const workbook = XLSX.read(arrayBuffer, { type: "array" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
            const products = data.slice(1).map(row => ({
                name: row[0],
                id: row[5] // pallet label as ID
            }));
    
            g_productNameSelect.innerHTML = '<option value="">Select Product</option>' +
                products.map(product => `<option value="${product.name}" data-id="${product.id}">${product.name}</option>`).join('');

        } catch (error) {
            console.error("Failed to load or parse the Excel file:", error);
        }

        try {
            const response = await fetch("/production_lines.xlsx");
            const arrayBuffer = await response.arrayBuffer();
    
            const workbook = XLSX.read(arrayBuffer, { type: "array" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
            const production_lines = data.slice(1).map(row => ({
                name: row[0],
                id: row[1]
            }));
    
            g_productionLineSelect.innerHTML = '<option value="">Select Production Line</option>' +
                production_lines.map(production_line => `<option value="${production_line.name}" data-id="${production_line.id}">${production_line.name}</option>`).join('');

        } catch (error) {
            console.error("Failed to load or parse the Excel file:", error);
        }
        // End of loadExcelFile
    }

    loadExcelFile();
    loadSettings();

    setInterval(async () => {
        try {
            const settings = await loadSettings();
            
            // Only proceed if settings loaded successfully
            if (settings.success) {
            // Check if version changed
            if (g_currentVersion !== null && g_currentVersion !== settings.version) {
                console.log("Version changed from", g_currentVersion, "to", settings.version);
                g_pendingUpdates = true;          
            }
            
            // If there's a pending update
            if (g_pendingUpdates) {
                // Close any open modals
                if (g_productNameSelect.value !== "" || g_productionLineSelect.value !== "") {
                    g_showVersionUpdateNotification = true;
                }
                // Reload the Excel file
                await loadExcelFile();
                
                resetForm();
                
                // Show the update notification
                if (g_showVersionUpdateNotification) {
                    showModalWithButtons("New version updated! <br> Please redo the current check", false);
                    g_showVersionUpdateNotification = false;
                }
                
                g_pendingUpdates = false;
            }
            }
        } catch (error) {
            console.error("Error during version check:", error);
        }
    }, g_updateCheckFrequency * 1000);

    // End of DOMContentLoaded event listener
});

// Update submit button status
function updateSubmitButton() {
    const lineSelected = g_productionLineSelect.value !== '';
    const productSelected = g_productNameSelect.value !== '';
    const dateSelected = document.querySelector('input[name="productionDate"]:checked') !== null;
    
    g_submitButton.disabled = !(lineSelected && productSelected && dateSelected);
    
    // Debugging logs (you can remove these after testing)
    // console.log('Line selected:', lineSelected);
    // console.log('Product selected:', productSelected);
    // console.log('Date selected:', dateSelected);
    // console.log('Button should be disabled:', !(lineSelected && productSelected && dateSelected));
    // End of updateSubmitButton
}

// Submit data
async function submitSelection() {
    const line = g_productionLineSelect.value;
    const productName = g_productNameSelect.value;
    const productId = g_productNameSelect.selectedOptions[0].dataset.id;
    const productionDate = document.querySelector('input[name="productionDate"]:checked').value;

    const timeFormatter = new Intl.DateTimeFormat("en-AU", {
        timeZone: "Australia/Sydney",
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
      
    const parts = timeFormatter.formatToParts(new Date());
    const formattedTimestamp = `${parts[0].value}-${parts[2].value}-${parts[4].value} ${parts[6].value}:${parts[8].value}:${parts[10].value}`;

    const data = {
        timestamp: formattedTimestamp,
        'production Date': productionDate,
        'production Line': line,
        'product ID': productId,
        'product Name': productName
    };

    try {
        const response = await fetch('/api/saveSelection', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Failed to save selection');

        showSuccessModal();

        resetForm();

    } catch (error) {
        console.error('Error saving selection:', error);
        alert('Failed to save selection. Please try again.');
    }
    // End of submitSelection
}

function resetForm() {
    g_productionLineSelect.value = '';
    g_productNameSelect.value = '';
    g_submitButton.disabled = true;    
    // End of resetForm
}

// Modal functions
function showSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.style.display = 'flex';
    // End of showSuccessModal
}

function closeModal() {
    const modal = document.getElementById('successModal');
    modal.style.display = 'none';
    // End of closeModal
}

// Event listeners for modal
document.querySelector('.close-modal').addEventListener('click', () => {
    closeModal();
    // End of close-modal event listener
});

document.querySelector('.modal-button').addEventListener('click', () => {
    closeModal();
    // End of modal-button event listener
});

// Close modal when clicking outside of it
window.addEventListener('click', (event) => {
    const modal = document.getElementById('successModal');
    if (event.target === modal) {
        closeModal();
    }
    // End of window click event listener
});

// Event listeners
g_productionLineSelect.addEventListener('change', () => {
    updateSubmitButton();
    // End of productionLineSelect change event listener
});

g_productNameSelect.addEventListener('change', () => {
    updateSubmitButton();
    // End of productNameSelect change event listener
});

document.addEventListener('change', function(e) {
    if (e.target.name === 'productionDate') {
        updateSubmitButton();
    }
    // End of document change event listener
});

g_submitButton.addEventListener('click', () => {
    submitSelection();
    // End of submitButton click event listener
});