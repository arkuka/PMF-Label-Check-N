// Global variables
let g_configData = null;
let g_productName = "";
let g_fields = {
  topLabel: "",
  sideLabel: "",
  bottomLabel: "",
  cartonLabel: "",
  palletLabel: "",
  watermark: "",
};
let g_shelfLifeDays = 0; // Shelf life in days
let g_headers = [];
let g_productNames = [];  // List of product names
let g_productNameLabel = "";
let g_isSubmitEnabled = false;
let g_prompted = false;
let g_showModal = false;
let g_possibleProduct = "";
let g_barcode = "";
let g_scannedBarcode = "";
let g_currentField = "";  // Tracks the currently input field
let g_scannedHCode = "";
let g_matchingProducts = [];
let g_currentMatchingIndex = 0;
let g_isCheckingFillingAuthority = false;
let g_theAuthorizedProductName = "";
let g_lastReceivedDataCache = null;
let g_lastSettings = null;
let g_currentVersion = null;
let g_updateCheckFrequency = 3600; // Default value in seconds
let g_lastUpdateCheckTime = 0;
let g_pendingUpdates = false;

// Global functions
const loadSettings = async () => {
  try {
    const response = await fetch("/settings.json");
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const settings = await response.json();
    
    console.log('loadSettingsFile');
    console.log('Settings loaded:', settings);

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

loadSettings();

const validateScan = (field, scannedCode) => {
    if (!g_configData || !g_productName) return;
  
    const productRow = g_configData.find((row) => row[0] === g_productName);
    if (!productRow) return;
  
    const fieldIndex = g_headers.indexOf(field);
    const correctCode = productRow[fieldIndex];

    const processedScannedCode = processScannedCode(scannedCode, fieldIndex);
  
    const isMatch = processedScannedCode === correctCode.trim();
    checkSubmitAvailability(isMatch);
    // End of validateScan
};

// Extract allFieldsValid as a separate function
const allFieldsValid = () => {
  if (!g_productName || !g_configData) return false;

  const productRow = g_configData.find((row) => row[0] === g_productName);
  if (!productRow) return false;

  return g_headers.slice(1).every((field) => {
    const fieldIndex = g_headers.indexOf(field);
    if (isFieldDisabled(field)) return true;

    const fieldValue = g_fields[field.toLowerCase()] || "";
    const correctCode = productRow[fieldIndex];

    const processedScannedCode = processScannedCode(fieldValue, fieldIndex);
    
    return processedScannedCode === correctCode;
  });
  // End of allFieldsValid
};

const checkSubmitAvailability = (isMatch) => {
  if (!g_productName || !g_configData || !isMatch) {
    g_isSubmitEnabled = false;
    submitButton.disabled = true;  
    return;
  }

  const productRow = g_configData.find((row) => row[0] === g_productName);
  if (!productRow) {
    g_isSubmitEnabled = false;
    submitButton.disabled = true;
    return;
  }

  g_isSubmitEnabled = allFieldsValid(); // Call the separate allFieldsValid function
  submitButton.disabled = !g_isSubmitEnabled;
  // End of checkSubmitAvailability
};

const isFieldDisabled = (field) => {
  if (!g_productName) return false;
  if (!g_configData) return false;
  const productRow = g_configData.find((row) => row[0] === g_productName);
  const fieldIndex = g_headers.indexOf(field);
  return !productRow || !productRow[fieldIndex];
  // End of isFieldDisabled
};

// Process input for special cases
const processScannedCode = (fieldValue, fieldOrIndex) => {
  let processedScannedCode = fieldValue.trim();

  // Check if fieldOrIndex is a number (fieldIndex) or string (field)
  if (
    (typeof fieldOrIndex === "number" && fieldOrIndex == 4) ||
    (typeof fieldOrIndex === "string" && fieldOrIndex == "carton label")
  ) {
    // Check if scannedCode starts with '01193'
    if (processedScannedCode.startsWith('01193')) {
      processedScannedCode = processedScannedCode.slice(2); // Remove first two characters '01'
      console.log("processedScannedCode =", processedScannedCode);
    }
  } else if (
    (typeof fieldOrIndex === "number" && fieldOrIndex == 5) ||
    (typeof fieldOrIndex === "string" && fieldOrIndex == "pallet label")
  ) {
    // Check if it contains "---"
    const [codePart, hCodePart] = processedScannedCode.split("---");
    processedScannedCode = codePart.trim(); // Keep only the part before "---"
    console.log("processedScannedCode =", processedScannedCode);

    // Store the part after "---" in global variable g_scannedHCode
    if (hCodePart !== undefined) {
      window.g_scannedHCode = hCodePart.trim();
      console.log("g_scannedHCode =", window.g_scannedHCode);
    }
  }

  return processedScannedCode;
  // End of processScannedCode
};

// Get input field background color
const getInputBackgroundColor = (field) => {
  if (!g_configData || !g_productName) return "#FFFFFF";

  const fieldValue = g_fields[field] || "";
  const productRow = g_configData.find((row) => row[0] === g_productName);
  const fieldIndex = g_headers.findIndex((header) => header.toLowerCase() === field.toLowerCase());

  if (fieldIndex === -1 || !productRow || !productRow[fieldIndex]) return "#DDDDDD";
  if (fieldValue === "") return "#F0B9B9";

  const correctCode = productRow[fieldIndex];
  const processedScannedCode = processScannedCode(fieldValue, fieldIndex);

  return processedScannedCode === correctCode ? "#d3f8d3" : "#F0B9B9";
  // End of getInputBackgroundColor
};

// Get field icon
const getFieldIcon = (field) => {
  const fieldValue = g_fields[field] || "";
  if (fieldValue === "") return "";

  const productRow = g_configData.find((row) => row[0] === g_productName);
  const fieldIndex = g_headers.findIndex((header) => header.toLowerCase() === field.toLowerCase());
  const correctCode = productRow ? productRow[fieldIndex] : "";

  const processedScannedCode = processScannedCode(fieldValue, fieldIndex);

  return processedScannedCode === correctCode
    ? '<span style="color: green">✅</span>'
    : '<span style="color: red">❌</span>';
  // End of getFieldIcon
};

const renderInputFields = () => {
  const inputFieldsContainer = document.getElementById("inputFields");
  inputFieldsContainer.innerHTML = g_headers.slice(1).map((header) => `
    <div class="form-group">
      <label>${header}: </label>
      <div class="input-wrapper">
        <input
          type="text"
          id="${header.toLowerCase()}"
          value="${g_fields[header.toLowerCase()] || ""}"
          oninput="handleInputChange('${header.toLowerCase()}', this.value, event)"
          onkeydown="handleInputChange('${header.toLowerCase()}', this.value, event)"
          ${isFieldDisabled(header) ? "disabled" : ""}
          style="background-color: ${getInputBackgroundColor(header.toLowerCase())}"
        />
        ${getFieldIcon(header.toLowerCase())}
      </div>
    </div>
  `).join("");
  // End of renderInputFields
};

const updateFieldAvailability = (selectedProductName) => {
  const productRow = g_configData.find((row) => row[0] === selectedProductName);
  if (!productRow) return;

  g_fields = {
    topLabel: productRow[g_headers.indexOf("topLabel")] ? g_fields.topLabel : "",
    sideLabel: productRow[g_headers.indexOf("sideLabel")] ? g_fields.sideLabel : "",
    bottomLabel: productRow[g_headers.indexOf("bottomLabel")] ? g_fields.bottomLabel : "",
    cartonLabel: productRow[g_headers.indexOf("cartonLabel")] ? g_fields.cartonLabel : "",
    palletLabel: productRow[g_headers.indexOf("palletLabel")] ? g_fields.palletLabel : "",
    waterMark: productRow[g_headers.indexOf("waterMark")] ? g_fields.waterMark : "",
  };

  g_shelfLifeDays = productRow[7] || 0;  // shelfLifeDays is in the 8th column
  // End of updateFieldAvailability
};

const resetForm = () => {
  g_productName = "";
  g_fields = {
    topLabel: "",
    sideLabel: "",
    bottomLabel: "",
    cartonLabel: "",
    palletLabel: "",
    waterMark: "",
  };

  g_shelfLifeDays = 0; // Shelf life in days
  g_scannedHCode = "";
  g_scannedBarcode = "";

  g_isSubmitEnabled = false;
  renderInputFields();  
  submitButton.disabled = !g_isSubmitEnabled;
  
  // Reset the Product Name dropdown to the default value (empty string or any default value)
  const productNameSelect = document.getElementById("productNameSelect");
  productNameSelect.value = "";  // Reset to default (empty or first option)
  g_theAuthorizedProductName = "";
  // End of resetForm
};

// Update showModalWithButtons to support HTML content
const showModalWithButtons = (message, showConfirmCancel = true, imageUrl = "") => {
    const modalMessage = document.getElementById("modalMessage");
    modalMessage.innerHTML = message; // Use innerHTML to support HTML content

    // Set image
    const modalImage = document.getElementById("modalImage");
    if (showConfirmCancel && imageUrl) {
        modalImage.src = imageUrl;
        modalImage.style.display = "block";

        modalImage.onload = () => {
            const maxWidth = 500;
            const maxHeight = 500;
            const width = modalImage.naturalWidth;
            const height = modalImage.naturalHeight;

            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                modalImage.style.width = `${width * ratio}px`;
                modalImage.style.height = `${height * ratio}px`;
            } else {
                modalImage.style.width = `${width}px`;
                modalImage.style.height = `${height}px`;
            }
        };
    } else {
        modalImage.style.display = "none";
    }

    // Set button display status
    const modalConfirmButton = document.getElementById("modalConfirmButton");
    const modalCancelButton = document.getElementById("modalCancelButton");
    const modalOkButton = document.getElementById("modalOkButton");

    if (showConfirmCancel) {
        modalConfirmButton.style.display = "inline-block";
        modalCancelButton.style.display = "inline-block";
        modalOkButton.style.display = "none";
    } else {
        modalConfirmButton.style.display = "none";
        modalCancelButton.style.display = "none";
        modalOkButton.style.display = "inline-block";
    }

    // Show modal
    const modal = document.getElementById("modal");
    modal.style.display = "flex";
    // End of showModalWithButtons
};

// Global handleInputChange function
const handleInputChange = (field, value, event) => {
  value = value.toUpperCase();
  value = value.trim();

  const inputElement = document.getElementById(field);
  if (inputElement) {
    inputElement.value = value; // Reflect the uppercase value in the UI immediately
  }

  let processedScannedCode = value.trim();
  console.log("handleInputChange(); field=", field);
  console.log("handleInputChange(); value=", value);
  
  processedScannedCode = processScannedCode(value, field);
  g_fields[field] = processedScannedCode;
  
  if (event.key === "Enter") {   
    if (!g_productName && value.trim() !== "") {
      // Find all products that match this barcode in the specified field
      g_matchingProducts = g_configData.filter((row) => {
        const fieldIndex = g_headers.indexOf(field);
        return row[fieldIndex] === processedScannedCode;
      });

      if (g_matchingProducts.length > 0) {
        // Start with the first matching product
        g_currentMatchingIndex = 0;
        promptForProductConfirmation(field, processedScannedCode);
      } else {
        // No matching products found
        showModalWithButtons("No matching product information found for this barcode.", false);
      }
    } else {
      // If productName already exists, validate the scan
      validateScan(field, processedScannedCode);
    }

    renderInputFields();
    g_currentField = field;
  }
  // End of handleInputChange
};

const promptForProductConfirmation = (field, scannedCode) => {
    if (g_matchingProducts.length === 0) {
        showModalWithButtons("No matching product information found for this barcode.", false);
        return;
    }

    // Store scanned barcode
    g_scannedBarcode = scannedCode;

    // Create HTML for product selection list, radio buttons and product names on the same line
    const productListHtml = g_matchingProducts
        .map((product, index) => `
            <div style="display: flex; align-items: center; margin: 8px 0;">
                <input type="radio" name="productSelection" id="product_${index}" value="${index}" ${index === 0 ? 'checked' : ''} style="width: 16px; height: 16px; min-width: 16px; margin-right: 8px; vertical-align: middle;">
                <label for="product_${index}" style="flex: 1; word-wrap: break-word; overflow-wrap: break-word;">${product[0]}</label>
            </div>
        `)
        .join('');

    // Create modal content
    const modalContent = `
        <div style="text-align: left;">
            <p style="margin-bottom: 10px;">Please select the product for processing</p>
            ${productListHtml}            
        </div>
    `;

    // Show modal
    showModalWithButtons(modalContent, true);
    // End of promptForProductConfirmation
};

// Handle product selection
const handleProductSelection = (field) => {
    const selectedRadio = document.querySelector('input[name="productSelection"]:checked');
    const modal = document.getElementById("modal");

    if (!selectedRadio) {
        showModalWithButtons("Please select a product before confirming.", true);
        return;
    }

    const selectedIndex = parseInt(selectedRadio.value);
    g_possibleProduct = g_matchingProducts[selectedIndex][0];
    g_productName = g_possibleProduct;
    updateFieldAvailability(g_possibleProduct);

    if (g_currentField) {
        g_fields[g_currentField] = g_scannedBarcode;
    }

    // Update product dropdown
    const productSelect = document.getElementById("productNameSelect");
    if (productSelect) {
        productSelect.value = g_productName;
    }

    // Render input fields and update submit button status
    renderInputFields();
    g_isSubmitEnabled = allFieldsValid();
    submitButton.disabled = !g_isSubmitEnabled;

    // Close modal and reset matching state
    modal.style.display = "none";
    resetMatchingState();
    // End of handleProductSelection
};

// Update modalConfirmButton event listener
modalConfirmButton.addEventListener("click", () => {
    handleProductSelection(g_currentField);
    // End of modalConfirmButton event listener
});

// Update modalCancelButton event listener
modalCancelButton.addEventListener("click", () => {
    const modal = document.getElementById("modal");
    modal.style.display = "none";
    resetMatchingState();
    // End of modalCancelButton event listener
});

document.getElementById('resetButton').addEventListener('click', function() {
  // Reset form logic
  resetForm();
  // End of resetButton event listener
});

const resetModal2Inputs = () => {
  document.getElementById("lineNumber").value = "";
  document.getElementById("palletNumber").value = "";
  document.getElementById("cartonCount").value = "";
  document.getElementById("hcode").value = "";
  document.getElementById("ubd").value = "";
  const modal2Message = document.getElementById("modal2Message");
  if (modal2Message) modal2Message.style.display = "none"; // Hide message as well
  // End of resetModal2Inputs
};

const resetMatchingState = () => {
  g_matchingProducts = [];
  g_currentMatchingIndex = 0;
  g_possibleProduct = "";
  g_scannedBarcode = "";
  // End of resetMatchingState
};

// DOMContentLoaded event
document.addEventListener("DOMContentLoaded", () => {
  const productNameSelect = document.getElementById("productNameSelect");
  const submitButton = document.getElementById("submitButton");
  const modal = document.getElementById("modal");
  const modalMessage = document.getElementById("modalMessage");
  const modalConfirmButton = document.getElementById("modalConfirmButton");
  const modalCancelButton = document.getElementById("modalCancelButton");

  submitButton.disabled = true; // Explicitly disable button

  // Add change event listener for dropdown
  productNameSelect.addEventListener("change", (event) => {
    g_productName = event.target.value; // Update g_productName
    updateFieldAvailability(g_productName); // Update field availability
    renderInputFields(); // Re-render input fields
    // End of productNameSelect change event listener
  });

  // Load Excel file
  const loadExcelFile = async () => {
      try {
        const response = await fetch("/label_library.xlsx");
        const arrayBuffer = await response.arrayBuffer();

        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const stringData = data.map((row) => row.map((cell) => String(cell).trim()));

        console.log('loadExcelFile');
        g_configData = stringData;

        g_headers = stringData[0];
        g_productNames = stringData.slice(1).map((row) => row[0]);
        g_productNameLabel = stringData[0][0];

        // Update UI
        document.getElementById("productNameLabel").textContent = g_productNameLabel;
        productNameSelect.innerHTML = `<option value="">Select Product</option>` +
        g_productNames.map((name) => `<option value="${name}">${name}</option>`).join("");

        renderInputFields();
      } catch (error) {
        console.error("Failed to load or parse the Excel file:", error);
      }
      // End of loadExcelFile
  };

  const convertToUpperCase = (inputId) => {
      const input = document.getElementById(inputId);
      input.addEventListener('input', (e) => {
          e.target.value = e.target.value.toUpperCase();
          // End of input event listener
      });
      // End of convertToUpperCase
  };

  modalOkButton.addEventListener("click", () => {
    // Close modal
    g_showModal = false;
    modal.style.display = "none";
  
    // Reset form
    resetForm();
    // End of modalOkButton event listener
  });

  /**
   * Checks filling authority record for the given production line
   * @param {string} lineNumber - The production line number entered by user (e.g., "1", "5A", etc.)
   * @returns {Promise<boolean>} - Returns true if check passes or no record found, false if mismatch
   */
  function checkFillingAuthoritySync(lineNumber) {
      // Convert line number to standardized format
      const lineMap = {
        '1': 'L01', '2': 'L02', '3': 'L03', '4': 'L04',
        '5A': 'L05', '5B': 'L05', '6': 'L06', '7': 'L07',
        '8': 'L08', '9': 'L09', '10': 'L10', '11': 'L11',
        '12': 'L12', '13': 'L13', '14': 'L14', '15': 'L15'
      };
      
      const standardizedLine = lineMap[lineNumber.toUpperCase()];
      if (!standardizedLine) {
        console.error('[2] Invalid line number:', lineNumber);
        return true;
      }

    try {
        // Synchronous XMLHttpRequest for file list
        const listRequest = new XMLHttpRequest();
        listRequest.open('GET', '/api/logviewer?method=LIST', false); // false makes it synchronous
        listRequest.send(null);
      
        if (listRequest.status !== 200) {
          console.debug('[5] Failed to get file list, status:', listRequest.status);
          return true;
        }
    
        const listResult = JSON.parse(listRequest.responseText);
        if (!listResult.success || !listResult.files || listResult.files.length === 0) {
          console.debug('[6] No files available in response');
          return true;
        }
        console.debug('[7] Total files available:', listResult.files.length);
    
        // Function to check if filename matches our pattern
        const matchesPattern = (filename, line) => {
          const pattern = new RegExp(`^\\d{2}-\\d{2}-\\d{4}-${line}-Filling-Authority-.*\\.json$`, 'i');
          return pattern.test(filename);
        };
    
        // Get today's and yesterday's dates in DD-MM-YYYY format
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const formatDate = (date) => {
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}-${month}-${year}`;
        };
    
        const dateStrings = [formatDate(today), formatDate(yesterday)];
        console.debug('[8] Checking dates:', dateStrings);
    
        let mostRecentRecord = null;
        let mostRecentFile = null;
    
        // Find all matching files for our dates and line
        const matchingFiles = listResult.files.filter(file => {
          const matches = matchesPattern(file.fileName, standardizedLine) &&
                        dateStrings.some(dateStr => file.fileName.includes(dateStr));
          return matches;
        });
    
        // Sort files by upload date (newest first)
        matchingFiles.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    
        // Process matching files - we only need to check the most recent one
        if (matchingFiles.length > 0) {
            mostRecentFile = matchingFiles[0];
            
            // Synchronous XMLHttpRequest for file content
            const fileRequest = new XMLHttpRequest();
            fileRequest.open('GET', mostRecentFile.url, false); // false makes it synchronous
            fileRequest.send(null);
            
            if (fileRequest.status === 200) {
              const fileResult = JSON.parse(fileRequest.responseText);
              
              if (Array.isArray(fileResult)) {
                // Find records for our specific production line
                const lineRecords = fileResult.filter(record => 
                  record["production Line"] === standardizedLine
                );
                
                if (lineRecords.length > 0) {
                  mostRecentRecord = lineRecords[0];
                } else {
                  console.debug('[19] No records found for this production line');
                }
              } else {
                console.debug('[20] File content is not in expected array format');
              }
            } else {
              console.debug('[21] Failed to fetch file content, status:', fileRequest.status);
            }
        }
    
        if (!mostRecentRecord) {
          console.debug('[22] No matching records found in the most recent file');
          g_theAuthorizedProductName = "n/a";
          return false;
        }

        // ProductID = Pallet Label
        const currentPalletLabel = document.getElementById("pallet label").value.trim();
        g_theAuthorizedProductName = mostRecentRecord["product Name"];
        
        // Check if product IDs match
        if (mostRecentRecord["product ID"] !== currentPalletLabel) {
          console.debug('[25] Product ID mismatch detected');
          return false;
        }
        
        console.debug('[26] Product ID matches - proceeding');
        return true;
    } catch (error) {
      console.error('[ERROR] in checkFillingAuthority:', error);
      return true;
    }
    // End of checkFillingAuthoritySync
  }

  
  // Submit button click event
  submitButton.addEventListener("click", () => { // Submit button in the main page
    if (!g_productName || !g_configData) return;    
    modal2.style.display = "flex";
    // End of submitButton event listener
  });

  // Show modal2
  const modal2 = document.getElementById("modal2");
  const modal2CloseIcon = document.getElementById("modal2CloseIcon"); // New close icon

  // Close icon event listener
    modal2CloseIcon.addEventListener("click", () => {
    modal2.style.display = "none";
    resetModal2Inputs();
    // End of modal2CloseIcon event listener
  });

  // Add uppercase conversion for all Modal2 inputs
  const modal2Inputs = ['lineNumber', 'palletNumber', 'cartonCount', 'hcode', 'ubd'];
  modal2Inputs.forEach(inputId => convertToUpperCase(inputId));

  // Click handler for modal2Message
  const modal2Message = document.getElementById("modal2Message");
  modal2Message.addEventListener("click", () => {
      modal2Message.textContent = "";
      modal2Message.style.display = "none"; // Optional: hide it after clearing
      // End of modal2Message click event listener
  });
  
  // Submit button in modal2 click event
  const modalSubmitButton = document.getElementById("modalSubmitButton");
  
  modalSubmitButton.addEventListener("click", async () => {
    const lineNumber = document.getElementById("lineNumber").value;
    const palletNumber = document.getElementById("palletNumber").value;
    const cartonCount = document.getElementById("cartonCount").value;
    const hcode = document.getElementById("hcode").value;
    const ubd = document.getElementById("ubd").value;

    // Get modal2 message area
    const modal2Message = document.getElementById("modal2Message");

    // Check if all fields are filled
    if (!lineNumber || !palletNumber || !cartonCount || !hcode || !ubd) {      
      modal2Message.textContent = "Please fill in all fields.";
      modal2Message.style.display = "block";
      return;
    }

    // Validate Line Number
    const validLineNumbers = ["1", "2", "3", "4", "5A", "5B", "6", "7", "8", "9", "11", "12", "13", "14", "15"];
    if (!validLineNumbers.includes(lineNumber)) {
      modal2Message.textContent = "Invalid Line Number. Please enter one of: 1,2,3,4,5A,5B,6,7,8,9,11,12,13,14,15";
      modal2Message.style.display = "block";
      return;
    }
    
    if (window.g_scannedHCode !== hcode.toUpperCase()) {
      modal2Message.textContent = `Hcode( ${hcode} ) on the product label does not match the hcode( ${window.g_scannedHCode} ) on the pallet label. Please double check it!`;
      modal2Message.style.display = "block";
      return;
    }
    
    // Validate HCODE format
    const hcodeRegex = /^H\d{4}$/; // H followed by 4 digits
    if (!hcodeRegex.test(hcode)) {
      modal2Message.textContent = "Invalid HCODE format. Please enter in the format HDDMM (e.g., H1903).";
      modal2Message.style.display = "block";
      return;
    }

    // Validate UBD format
    const ubdRegex = /^\d{2}[A-Z]{3}$/; // NNMMM format (e.g., 01MAY)
    if (!ubdRegex.test(ubd)) {
        modal2Message.textContent = "Invalid UBD format. Please enter in the format NNMMM (e.g., 01MAY).";
        modal2Message.style.display = "block";
        return;
    }

    // Calculate days between HCODE and UBD
    const hcodeDate = parseHCODE(hcode); // Parse HCODE to date
    const ubdDate = parseUBD(ubd); // Parse UBD to date
    let daysDifference = Math.floor((ubdDate - hcodeDate) / (1000 * 60 * 60 * 24)); // Calculate difference in days

    // If not an integer, convert to integer
    if (!Number.isInteger(daysDifference)) {
      daysDifference = parseInt(daysDifference, 10);
      console.warn("daysDifference was not an integer, converted to:", daysDifference);
    }
    if (!Number.isInteger(g_shelfLifeDays)) {
      g_shelfLifeDays = parseInt(g_shelfLifeDays, 10);
      console.warn("g_shelfLifeDays was not an integer, converted to:", g_shelfLifeDays);
    }

    // Check if the difference matches shelf life
    if (daysDifference !== g_shelfLifeDays) {
      // Show warning message
      modal2Message.textContent = `The difference between HCODE and UBD is ${daysDifference} days, which does not match the shelf life of ${g_shelfLifeDays} days. Please confirm HCODE and UBD.`;
      modal2Message.style.display = "block";
      return;
    } else {
      // If matched, hide warning message
      modal2Message.style.display = "none";
    }

    // If the product to be submitted is not authorized by Filling, return
    console.log("submit button, isCheckingFillingAuthority =", g_isCheckingFillingAuthority ? "true" : "false");
    if (g_isCheckingFillingAuthority) {
        console.log("going to call checkFillingAuthority");
        if (checkFillingAuthoritySync(lineNumber, modal2Message) === false) {
          // Show warning message      
          modal2Message.innerHTML = `
          <div style="color: red; text-align: left;">          
            <p>The product you are trying to submit is:</p>
            <p><strong>${g_productName}</strong></p>
            <p>The product authorized by the Filling department is:</p>
            <p><strong>${g_theAuthorizedProductName}</strong></p>
            <p> Please confirm with the Filling department</p>            
          </div>
        `;
        modal2Message.style.display = "block";
        console.log("modal2Message.innerHTML=", modal2Message.innerHTML);
        return;
      }
    }
      
    // If validation passes, submit data
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

    const productRow = g_configData.find((row) => row[0] === g_productName);
    const submittedData = {
      timestamp: formattedTimestamp,
      productName: g_productName,
      barcodes: g_headers.slice(1).map((header) => {
        const value = g_fields[header.toLowerCase()] || "";
        return `${value}`; // Format as "value (field name)"
      }),
      lineNumber,
      palletNumber,
      cartonCount,
      hcode,
      ubd,
    };

    try {
      const response2 = await fetch("/api/blob-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submittedData),
      });

      if (!response2.ok) {
        throw new Error(`HTTP error! status: ${response2.status}`);
      }
      else {        
        console.log("Submission successful");
      }
      
      // Close modal2
      const modal2 = document.getElementById("modal2");
      modal2.style.display = "none";

      // Reset Modal2 inputs after successful submission
      resetModal2Inputs(); 

      // Reset form
      resetForm();

      // Show success message
      showModalWithButtons("Data submitted successfully!", false);
      
    } catch (error) {
      console.error("Error submitting data:", error);
    }
    // End of modalSubmitButton event listener
  });

  // Parse HCODE to date
  function parseHCODE(hcode) {
    const day = parseInt(hcode.slice(1, 3), 10); // Extract DD
    const month = parseInt(hcode.slice(3, 5), 10) - 1; // Extract MM (months are 0-based)
    const currentYear = new Date().getFullYear();
    return new Date(currentYear, month, day);
    // End of parseHCODE
  }

  // Parse UBD "DDMMM"
  function parseUBD(ubd) {
        const day = parseInt(ubd.slice(0, 2), 10); // First 2 digits
        const monthStr = ubd.slice(2, 5); // Last 3 letters
        const month = new Date(Date.parse(`01 ${monthStr} 2000`)).getMonth();
        const currentYear = new Date().getFullYear();
        return new Date(currentYear, month, day);
    // End of parseUBD
  }

  // Show confirmation modal
  function showConfirmationModal(message) {
    const modal = document.createElement("div");
    modal.style.position = "fixed";
    modal.style.top = "50%";
    modal.style.left = "50%";
    modal.style.transform = "translate(-50%, -50%)";
    modal.style.backgroundColor = "#ffcccc"; // Light red background
    modal.style.padding = "20px";
    modal.style.borderRadius = "10px";
    modal.style.cartonShadow = "0 2px 10px rgba(0, 0, 0, 0.1)";
    modal.style.textAlign = "center";
    modal.style.zIndex = "1000";
    modal.innerHTML = `
      <p>${message}</p>
      <button id="confirmButton" style="background-color: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">Confirm</button>
      <button id="cancelButton" style="background-color: #f44336; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">Cancel</button>
    `;

    document.body.appendChild(modal);

    // Add blinking effect
    let isRed = true;
    const interval = setInterval(() => {
      modal.style.backgroundColor = isRed ? "#ffcccc" : "#ff9999";
      isRed = !isRed;
    }, 500);

    // Confirm button click event
    document.getElementById("confirmButton").addEventListener("click", () => {
      clearInterval(interval);
      document.body.removeChild(modal);
      // End of confirmButton event listener
    });

    // Cancel button click event
    document.getElementById("cancelButton").addEventListener("click", () => {
      clearInterval(interval);
      document.body.removeChild(modal);
      // End of cancelButton event listener
    });
    // End of showConfirmationModal
  }

  // Initialize
  loadExcelFile();
  loadSettings();
  // End of DOMContentLoaded event listener
});