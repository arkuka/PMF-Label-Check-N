const g_productionLineSelect = document.getElementById('productionLineSelect');
const g_productNameSelect = document.getElementById('productNameSelect');
const g_submitButton = document.getElementById('submitButton');
const g_dateOptionsContainer = document.getElementById('dateOptions');
const g_noticeCloseButton = document.getElementById('noticeCloseButton')

let g_fillingStandards = []; // To store the filling standards data

let g_lastReceivedDataCache = null;
let g_lastSettings = null;
let g_currentVersion = null;
let g_updateCheckFrequency = 60; // Default value in seconds
let g_lastUpdateCheckTime = 0;
let g_pendingUpdates = false;

let g_lastRenderedDate = null;

// Track user activity state
let g_lastUserActivityTime = Date.now();
let g_inactiveCheckInterval = 3600; // 1 hour (in seconds)
let g_isUserActive = true;
let g_versionCheckIntervalId = null;
const g_activityHandlers = {};

let g_showVersionUpdateNotification = false;
let g_isCheckingFillingAuthority = true;

let g_debounceDuration = 500;

// Function to format date as YYYY-MM-DD (Weekday)
function formatDateWithWeekday(date) {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const weekday = days[date.getDay()];
    return `${day}-${month}-${year} (${weekday})`;
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
    }

    g_lastRenderedDate = formatDate(today);
}

// Monitor user activity to adjust version check frequency
function monitorUserActivity() {
    // Listen for all possible user activity events
    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
        g_lastUserActivityTime = Date.now();
        
        // If previously inactive, restore active state and normal check frequency
        if (!g_isUserActive) {
            g_isUserActive = true;
            console.log('User became active, restoring normal check frequency');
            setupVersionCheckInterval();
        }
    };
    
    // Add event listeners
    activityEvents.forEach(event => {
        document.removeEventListener(event, g_activityHandlers[event]);
        g_activityHandlers[event] = handleActivity;
        document.addEventListener(event, handleActivity, { passive: true });
    });
}

// Set up version check interval based on user activity state
function setupVersionCheckInterval() {
    // Clear existing interval
    if (g_versionCheckIntervalId) {
        clearInterval(g_versionCheckIntervalId);
    }
    
    // Determine check interval based on user activity state
    const checkInterval = g_isUserActive 
        ? g_updateCheckFrequency * 1000 
        : g_inactiveCheckInterval * 1000;
    
    console.log(`Setting version check interval to ${checkInterval/1000} seconds`);
    
    // Set up new interval
    g_versionCheckIntervalId = setInterval(async () => {
        try {
            // Check for user inactivity (more than 30 minutes)
            const inactiveThreshold = 30 * 60 * 1000; // 30 minutes (in milliseconds)
            const timeSinceLastActivity = Date.now() - g_lastUserActivityTime;
            
            if (timeSinceLastActivity > inactiveThreshold && g_isUserActive) {
                console.log('User inactive for 30+ minutes, reducing check frequency');
                g_isUserActive = false;
                setupDateSelection();
                setupVersionCheckInterval(); // Reset to longer interval
                return;
            }
            
            await performVersionCheck();
        } catch (error) {
            console.error("Error during version check:", error);
        }
    }, checkInterval);
}

// Debounce utility function
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Perform the actual version check logic
async function performVersionCheck() {
    try {
        const settings = await loadSettings();
        
        // Only proceed if settings loaded successfully
        if (settings.success) {
            // If there's a pending update
            if (g_pendingUpdates) {
                // Close any open modals
                if (g_productNameSelect.value !== "" || g_productionLineSelect.value !== "") {
                    g_showVersionUpdateNotification = true;
                }
                
                // Reload the Excel file
                await loadExcelFile();
                await loadFillingStandards();

                if(!g_isUserActive){
                    setupDateSelection();
                }
                
                resetForm();
                
                // Show the update notification
                if (g_showVersionUpdateNotification) {                        
                    showNoticeModal("New version updated <br> Please redo the Authority");
                    g_showVersionUpdateNotification = false;
                }
                
                g_pendingUpdates = false;
            }
        }
        else {
            console.error("Failed to load settings:", settings.error);
            return;
        }
    } catch (error) {
        console.error("Error during version check:", error);    
    }
}

// Load settings from server
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
        g_updateCheckFrequency = parseInt(settings["update check frequency"]) || 60;
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
        g_currentVersion = "2025.0.0.1";
        g_updateCheckFrequency = 60;
        g_isCheckingFillingAuthority = true;

        return {
            success: false,
            error: error.message,
            version: g_currentVersion,
            checkFrequency: g_updateCheckFrequency,
            checkFillingAuthority: g_isCheckingFillingAuthority
        };
    }
};

// Add this function to load the filling standards
async function loadFillingStandards() {
    try {
        const response = await fetch("/filling_standard_list.xlsx");
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        // Process the data - we only want rows where column C (index 2) is "Fill"
        g_fillingStandards = data.slice(1) // Skip header row
            .filter(row => row[2] === "Fill")
            .map(row => ({
                code: row[0],
                name: row[1],
                department: row[2],
                headcount: row[4],
                coverTime: row[5],
                speed: row[7],
                maxWeight: row[8],
                reworkPercent: row[9]
            }));
            
        console.log("Filling standards loaded:", g_fillingStandards);
    } catch (error) {
        console.error("Failed to load filling standards:", error);
        g_fillingStandards = []; // Reset to empty array if error occurs
    }
}

// Update the production standard display
function updateProductionStandardDisplay() {
    const selectedOption = g_productNameSelect.selectedOptions[0];
    if (!selectedOption) {
        document.getElementById('standardDetails').innerHTML = 
            '<p><strong>Select a product to view its standard</strong></p>';
        return;
    }

    const selectedProductCode = selectedOption.getAttribute('productCode'); 
    const selectedProductName = g_productNameSelect.value;
    
    if (!selectedProductCode) {
        document.getElementById('standardDetails').innerHTML = 
            '<p><strong>No product selected</strong></p>';
        return;
    }
    
    // Find the product in our standards
    const productStandard = g_fillingStandards.find(standard => 
        standard.code === selectedProductCode
    );
    
    if (!productStandard) {
        document.getElementById('standardDetails').innerHTML = 
            '<p><strong>No production standard found for this product</strong></p>';
        return;
    }
    
    // Update the standard display
    const detailsDiv = document.getElementById('standardDetails');
    detailsDiv.innerHTML = `
        <p><strong>Product:</strong> ${selectedProductName}</p>
        <p><strong>Headcount:</strong> ${productStandard.headcount}</p>
        <p><strong>C/Over Time:</strong> ${productStandard.coverTime} minutes</p>
        <p><strong>Production Speed:</strong> ${productStandard.speed} Tubs/Min</p>
        <p><strong>Max Weight (G/Away):</strong> ${productStandard.maxWeight} g</p>
        <p><strong>Allowed Rework (R/Work):</strong> ${productStandard.reworkPercent}</p>
    `;
}

// Load Excel data from server
const loadExcelFile = async () => {
    try {
        const response = await fetch("/label_library.xlsx");
        const arrayBuffer = await response.arrayBuffer();

        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const products = data.slice(1).map(row => ({
            name: row[0],
            id: row[5], // pallet label as ID
            code: row[5] // product code
        }));

        g_productNameSelect.innerHTML = '<option value="">Select Product</option>' +
            products.map(product => 
                `<option value="${product.name}" productCode="${product.code}">${product.name}</option>`
            ).join('');

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
            production_lines.map(production_line => 
                `<option value="${production_line.name}" data-id="${production_line.id}">${production_line.name}</option>`
            ).join('');

    } catch (error) {
        console.error("Failed to load or parse the Excel file:", error);
    }
};

// Update submit button status based on form completion
function updateSubmitButton() {
    const lineSelected = g_productionLineSelect.value !== '';
    const productSelected = g_productNameSelect.value !== '';
    const dateSelected = document.querySelector('input[name="productionDate"]:checked') !== null;
    
    g_submitButton.disabled = !(lineSelected && productSelected && dateSelected);
}

// Submit form data to server
async function submitSelection() {
    const line = g_productionLineSelect.value;
    const productName = g_productNameSelect.value;
    const productId = g_productNameSelect.selectedOptions[0].getAttribute('productCode');
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

        showNoticeModal("Selection saved successfully!");
        //resetForm();

    } catch (error) {
        console.error('Error saving selection:', error);
        alert('Failed to save selection. Please try again.');
    }
}

// Reset form to initial state
function resetForm() {
    setupDateSelection();
    g_productionLineSelect.value = '';
    g_productNameSelect.value = '';
    g_submitButton.disabled = true;
    document.getElementById('standardDetails').innerHTML = 
        '<p><strong>Select a product to view its standard</strong></p>';
}

// Show modal with message
function showNoticeModal(message) {
    const modal = document.getElementById('noticeModal');
    const modalMessage = document.getElementById("modalMessage");
    modalMessage.innerHTML = message;
    modal.style.display = 'flex';
}

// Close modal
function closeModal() {
    const modal = document.getElementById('noticeModal');
    modal.style.display = 'none';
}

// Initialize application when DOM is loaded
document.addEventListener("DOMContentLoaded", async () => {
    setupDateSelection();    
    monitorUserActivity();    
    
    try {
        await loadSettings();
        await loadExcelFile();
        await loadFillingStandards();
        setupVersionCheckInterval();
    } catch (error) {   
        console.error("Error during initialization:", error);
    }

    // Event listeners
    g_productionLineSelect.addEventListener('change', updateSubmitButton);
    g_productNameSelect.addEventListener('change', function() {
        updateSubmitButton();
        updateProductionStandardDisplay();
    });
    
    document.addEventListener('change', function(e) {
        if (e.target.name === 'productionDate') {
            updateSubmitButton();
        }
    });

    g_submitButton.addEventListener('click', debounce(async () => await submitSelection(), g_debounceDuration));

    // Modal event listeners
    g_noticeCloseButton.addEventListener('click', closeModal);

    window.addEventListener('click', (event) => {
        if (event.target === document.getElementById('noticeModal')) {
            closeModal();
        }
    });
});
