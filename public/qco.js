// 全局变量
let configData = null;
let productName = "";
let fields = {
  topLabel: "",
  sideLabel: "",
  bottomLabel: "",
  cartonLabel: "",
  palletLabel: "",
  watermark: "",
};
let shelfLifeDays = 0; // 保质期天数
let headers = [];
let productNames = [];  // 产品名称列表
let productNameLabel = "";
let isSubmitEnabled = false;
let prompted = false;
let showModal = false;
let possibleProduct = "";
let barcode = "";
let scannedBarcode = "";
let currentField = "";  // 用于记录当前输入的字段
let sannedHCode = ""
let matchingProducts = [];
let currentMatchingIndex = 0;
let isCheckingFillingAuthority = false;

// 全局函数
const validateScan = (field, scannedCode) => {
    if (!configData || !productName) return;
  
    const productRow = configData.find((row) => row[0] === productName);
    if (!productRow) return;
  
    const fieldIndex = headers.indexOf(field);
    const correctCode = productRow[fieldIndex];

    const processedScannedCode = processScannedCode(scannedCode, fieldIndex);
  
    const isMatch = processedScannedCode === correctCode.trim();
    checkSubmitAvailability(isMatch);
};

// 提取 allFieldsValid 为独立函数
const allFieldsValid = () => {
  if (!productName || !configData) return false;

  const productRow = configData.find((row) => row[0] === productName);
  if (!productRow) return false;

  return headers.slice(1).every((field) => {
    const fieldIndex = headers.indexOf(field);
    if (isFieldDisabled(field)) return true;

    const fieldValue = fields[field.toLowerCase()] || "";
    const correctCode = productRow[fieldIndex];

    const processedScannedCode = processScannedCode(fieldValue, fieldIndex);
    
    return processedScannedCode === correctCode;
  });
};


const checkSubmitAvailability = (isMatch) => {
  if (!productName || !configData || !isMatch) {
    isSubmitEnabled = false;
    submitButton.disabled = true;  
    return;
  }

  const productRow = configData.find((row) => row[0] === productName);
  if (!productRow) {
    isSubmitEnabled = false;
    submitButton.disabled = true;
    return;
  }

  isSubmitEnabled = allFieldsValid(); // 调用独立的 allFieldsValid 函数
  submitButton.disabled = !isSubmitEnabled;
};

const isFieldDisabled = (field) => {
  if (!productName) return false;
  if (!configData) return false;
  const productRow = configData.find((row) => row[0] === productName);
  const fieldIndex = headers.indexOf(field);
  return !productRow || !productRow[fieldIndex];
};

// 针对两种特殊情况，对输入的信息进行处理
const processScannedCode = (fieldValue, fieldOrIndex) => {
  let processedScannedCode = fieldValue.trim();

  // 判断传入的是 fieldIndex（数字）还是 field（字符串）
  if (
    (typeof fieldOrIndex === "number" && fieldOrIndex == 4) ||
    (typeof fieldOrIndex === "string" && fieldOrIndex == "carton label")
  ) {
    // 检查 scannedCode 的前五位是否为 '01193'
    if (processedScannedCode.startsWith('01193')) {
      processedScannedCode = processedScannedCode.slice(2); // 去掉前两位 '01'
      console.log("processedScannedCode =", processedScannedCode);
    }
  } else if (
    (typeof fieldOrIndex === "number" && fieldOrIndex == 5) ||
    (typeof fieldOrIndex === "string" && fieldOrIndex == "pallet label")
  ) {
    // 检查是否包含 "---"
    const [codePart, hCodePart] = processedScannedCode.split("---");
    processedScannedCode = codePart.trim(); // 只保留 "---" 前面的部分
    console.log("processedScannedCode =", processedScannedCode);

    // 将 "---" 后面的部分存储到全局变量 scannedHCode
    if (hCodePart !== undefined) {
      window.scannedHCode = hCodePart.trim();
      console.log("scannedHCode =", window.scannedHCode);
    }
  }

  return processedScannedCode;
};

// 获取输入框背景颜色
const getInputBackgroundColor = (field) => {
  if (!configData || !productName) return "#FFFFFF";

  const fieldValue = fields[field] || "";
  const productRow = configData.find((row) => row[0] === productName);
  const fieldIndex = headers.findIndex((header) => header.toLowerCase() === field.toLowerCase());

  if (fieldIndex === -1 || !productRow || !productRow[fieldIndex]) return "#DDDDDD";
  if (fieldValue === "") return "#F0B9B9";

  const correctCode = productRow[fieldIndex];
  const processedScannedCode = processScannedCode(fieldValue, fieldIndex);

  return processedScannedCode === correctCode ? "#d3f8d3" : "#F0B9B9";
};

// 获取字段图标
const getFieldIcon = (field) => {
  const fieldValue = fields[field] || "";
  if (fieldValue === "") return "";

  const productRow = configData.find((row) => row[0] === productName);
  const fieldIndex = headers.findIndex((header) => header.toLowerCase() === field.toLowerCase());
  const correctCode = productRow ? productRow[fieldIndex] : "";

  const processedScannedCode = processScannedCode(fieldValue, fieldIndex);

  return processedScannedCode === correctCode
    ? '<span style="color: green">✅</span>'
    : '<span style="color: red">❌</span>';
};

const renderInputFields = () => {
  
  const inputFieldsContainer = document.getElementById("inputFields");
  inputFieldsContainer.innerHTML = headers.slice(1).map((header) => `
    <div class="form-group">
      <label>${header}: </label>
      <div class="input-wrapper">
        <input
          type="text"
          id="${header.toLowerCase()}"
          value="${fields[header.toLowerCase()] || ""}"
          oninput="handleInputChange('${header.toLowerCase()}', this.value, event)"
          onkeydown="handleInputChange('${header.toLowerCase()}', this.value, event)"
          ${isFieldDisabled(header) ? "disabled" : ""}
          style="background-color: ${getInputBackgroundColor(header.toLowerCase())}"
        />
        ${getFieldIcon(header.toLowerCase())}
      </div>
    </div>
  `).join("");
};

const updateFieldAvailability = (selectedProductName) => {
  const productRow = configData.find((row) => row[0] === selectedProductName);
  if (!productRow) return;

  fields = {
    topLabel: productRow[headers.indexOf("topLabel")] ? fields.topLabel : "",
    sideLabel: productRow[headers.indexOf("sideLabel")] ? fields.sideLabel : "",
    bottomLabel: productRow[headers.indexOf("bottomLabel")] ? fields.bottomLabel : "",
    cartonLabel: productRow[headers.indexOf("cartonLabel")] ? fields.cartonLabel : "",
    palletLabel: productRow[headers.indexOf("palletLabel")] ? fields.palletLabel : "",
    waterMark: productRow[headers.indexOf("waterMark")] ? fields.waterMark : "",
  };

  shelfLifeDays = productRow[7] || 0;  // shelfLifeDays 为第 8 列
};

const resetForm = () => {
  productName = "";
  fields = {
    topLabel: "",
    sideLabel: "",
    bottomLabel: "",
    cartonLabel: "",
    palletLabel: "",
    waterMark: "",
  };

  shelfLifeDays = 0; // 保质期天数
  scannedHCode = ""
  scannedBarcode = ""

  isSubmitEnabled = false;
  renderInputFields();  
  submitButton.disabled = !isSubmitEnabled;
  
  // Reset the Product Name dropdown to the default value (empty string or any default value)
  const productNameSelect = document.getElementById("productNameSelect");
  productNameSelect.value = "";  // Reset to default (empty or first option)
};

// 更新 showModalWithButtons 函数以支持 HTML 内容
const showModalWithButtons = (message, showConfirmCancel = true, imageUrl = "") => {
    const modalMessage = document.getElementById("modalMessage");
    modalMessage.innerHTML = message; // 使用 innerHTML 以支持 HTML 内容

    // 设置图片
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

    // 设置按钮显示状态
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

    // 显示模态窗口
    const modal = document.getElementById("modal");
    modal.style.display = "flex";
};


// 全局 handleInputChange 函数
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
  fields[field] = processedScannedCode;
  
  if (event.key === "Enter") {   
    if (!productName && value.trim() !== "") {
      // Find all products that match this barcode in the specified field
      matchingProducts = configData.filter((row) => {
        const fieldIndex = headers.indexOf(field);
        return row[fieldIndex] === processedScannedCode;
      });

      if (matchingProducts.length > 0) {
        // Start with the first matching product
        currentMatchingIndex = 0;
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
    currentField = field;
  }
};

const promptForProductConfirmation = (field, scannedCode) => {
    if (matchingProducts.length === 0) {
        showModalWithButtons("No matching product information found for this barcode.", false);
        return;
    }

    // 存储扫描的条码
    scannedBarcode = scannedCode;

    // 创建产品选择列表的 HTML，单选按钮和产品名称在同一行
    const productListHtml = matchingProducts
        .map((product, index) => `
            <div style="display: flex; align-items: center; margin: 8px 0;">
                <input type="radio" name="productSelection" id="product_${index}" value="${index}" ${index === 0 ? 'checked' : ''} style="width: 16px; height: 16px; min-width: 16px; margin-right: 8px; vertical-align: middle;">
                <label for="product_${index}" style="flex: 1; word-wrap: break-word; overflow-wrap: break-word;">${product[0]}</label>
            </div>
        `)
        .join('');

    // 创建模态窗口内容
    const modalContent = `
        <div style="text-align: left;">
            <p style="margin-bottom: 10px;">Please select the correct product to process</p>
            ${productListHtml}            
        </div>
    `;

    // 显示模态窗口
    showModalWithButtons(modalContent, true);
};

// 处理产品选择的函数
const handleProductSelection = (field) => {
    const selectedRadio = document.querySelector('input[name="productSelection"]:checked');
    const modal = document.getElementById("modal");

    if (!selectedRadio) {
        showModalWithButtons("Please select a product before confirming.", true);
        return;
    }

    const selectedIndex = parseInt(selectedRadio.value);
    possibleProduct = matchingProducts[selectedIndex][0];
    productName = possibleProduct;
    updateFieldAvailability(possibleProduct);

    if (currentField) {
        fields[currentField] = scannedBarcode;
    }

    // 更新产品下拉框
    const productSelect = document.getElementById("productNameSelect");
    if (productSelect) {
        productSelect.value = productName;
    }

    // 渲染输入字段并更新提交按钮状态
    renderInputFields();
    isSubmitEnabled = allFieldsValid();
    submitButton.disabled = !isSubmitEnabled;

    // 关闭模态窗口并重置匹配状态
    modal.style.display = "none";
    resetMatchingState();
};

// 更新 modalConfirmButton 的事件监听器
modalConfirmButton.addEventListener("click", () => {
    handleProductSelection(currentField);
});

// 更新 modalCancelButton 的事件监听器
modalCancelButton.addEventListener("click", () => {
    const modal = document.getElementById("modal");
    modal.style.display = "none";
    resetMatchingState();
});

document.getElementById('resetButton').addEventListener('click', function() {
  // 重置表单逻辑
  resetForm()
});

const resetModal2Inputs = () => {
  document.getElementById("lineNumber").value = "";
  document.getElementById("palletNumber").value = "";
  document.getElementById("cartonCount").value = "";
  document.getElementById("hcode").value = "";
  document.getElementById("ubd").value = "";
  const modal2Message = document.getElementById("modal2Message");
  if (modal2Message) modal2Message.style.display = "none"; // 同时隐藏提示信息
};

// DOMContentLoaded 事件
document.addEventListener("DOMContentLoaded", () => {
  const productNameSelect = document.getElementById("productNameSelect");
  const submitButton = document.getElementById("submitButton");
  const modal = document.getElementById("modal");
  const modalMessage = document.getElementById("modalMessage");
  const modalConfirmButton = document.getElementById("modalConfirmButton");
  const modalCancelButton = document.getElementById("modalCancelButton");

  submitButton.disabled = true; // 显式禁用按钮

  // 为下拉框添加 change 事件监听器
  productNameSelect.addEventListener("change", (event) => {
    productName = event.target.value; // 更新 productName
    updateFieldAvailability(productName); // 更新字段可用性
    renderInputFields(); // 重新渲染输入字段
  });

  // 加载 Excel 文件
  const loadExcelFile = async () => {
      try {
        const response = await fetch("/label_library.xlsx");
        const arrayBuffer = await response.arrayBuffer();

        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const stringData = data.map((row) => row.map((cell) => String(cell).trim()));

        console.log('loadExcelFile');
        configData = stringData;

        headers = stringData[0];
        productNames = stringData.slice(1).map((row) => row[0]);
        productNameLabel = stringData[0][0];

        // 更新 UI
        document.getElementById("productNameLabel").textContent = productNameLabel;
        productNameSelect.innerHTML = `<option value="">Select Product</option>` +
        productNames.map((name) => `<option value="${name}">${name}</option>`).join("");

        renderInputFields();

        // 读取第二个工作表（版本信息）
        const sheet2 = workbook.Sheets[workbook.SheetNames[1]];
        const settings = XLSX.utils.sheet_to_json(sheet2, { header: 1 });
        const versionInfo = settings[1][0]; // 获取第二行第一列的值（A2）
    
        // 显示版本号
        const versionInfoElement = document.getElementById("versionInfo");
        if (versionInfoElement) {
          versionInfoElement.textContent = "ver:"+versionInfo;        
        }        
        isCheckingFillingAuthority = settings[1][1] ? true : false; // 获取第二行第一列的值（B2）
        console.log ("isCheckingFillingAuthority is ", isCheckingFillingAuthority?"true":"false")
      } catch (error) {
        console.error("Failed to load or parse the Excel file:", error);
      }
  };

  const resetMatchingState = () => {
    matchingProducts = [];
    currentMatchingIndex = 0;
    possibleProduct = "";
    scannedBarcode = "";
  };

  const convertToUpperCase = (inputId) => {
      const input = document.getElementById(inputId);
      input.addEventListener('input', (e) => {
          e.target.value = e.target.value.toUpperCase();
      });
  };

  modalOkButton.addEventListener("click", () => {
    // 关闭模态窗口
    showModal = false;
    modal.style.display = "none";
  
    // 重置表单
    resetForm();
  });

  /**
 * Checks filling authority record for the given production line
 * @param {string} lineNumber - The production line number entered by user (e.g., "1", "5A", etc.)
 * @returns {Promise<boolean>} - Returns true if check passes or no record found, false if mismatch
 */
function checkFillingAuthority(lineNumber, modal2Message) {
  console.debug('[1] Starting checkFillingAuthority for line:', lineNumber);
  
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
  console.debug('[3] Standardized line number:', standardizedLine);

  try {
    console.debug('[4] Fetching complete file list...');
    const listResponse = await fetch('/api/logviewer?method=LIST');
    if (!listResponse.ok) {
      console.debug('[5] Failed to get file list, status:', listResponse.status);
      return true;
    }

    const listResult = await listResponse.json();
    if (!listResult.success || !listResult.files || listResult.files.length === 0) {
      console.debug('[6] No files available in response');
      return true;
    }
    console.debug('[7] Total files available:', listResult.files.length);

    // Function to extract date from filename (format: DD-MM-YYYY)
    const extractDate = (filename) => {
      const match = filename.match(/(\d{2})-(\d{2})-(\d{4})/);
      return match ? `${match[3]}${match[2]}${match[1]}` : null;
    };

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
      if (matches) {
        console.debug('[9] Found matching file:', file.fileName);
      }
      return matches;
    });

    console.debug('[10] Total matching files found:', matchingFiles.length);

    // Sort files by upload date (newest first)
    matchingFiles.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    if (matchingFiles.length > 0) {
      console.debug('[11] Sorted files (newest first):', matchingFiles.map(f => f.fileName));
    }

    // Process matching files - we only need to check the most recent one
    // Process matching files - we only need to check the most recent one
    if (matchingFiles.length > 0) {
      mostRecentFile = matchingFiles[0];
      console.debug('[12] Processing most recent file:', mostRecentFile.fileName);
      
      console.debug('[14] Fetching file content...');
      const fileResponse = await fetch(mostRecentFile.url);
      
      if (fileResponse.ok) {
        console.debug('[15] File content fetched successfully');
        const fileResult = await fileResponse.json();
        console.log('fileResult=', fileResult);
        
        // 修改这里的检查逻辑
        if (Array.isArray(fileResult)) {  // 直接检查是否是数组
          console.debug('[16] File contains', fileResult.length, 'records');
          
          // Find records for our specific production line
          const lineRecords = fileResult.filter(record => 
            record["production Line"] === standardizedLine
          );
          console.debug('[17] Found', lineRecords.length, 'records for line', standardizedLine);
          
          if (lineRecords.length > 0) {
            mostRecentRecord = lineRecords[0];
            console.debug('[18] Most recent record:', mostRecentRecord);
          } else {
            console.debug('[19] No records found for this production line');
          }
        } else {
          console.debug('[20] File content is not in expected array format');
        }
      } else {
        console.debug('[21] Failed to fetch file content, status:', fileResponse.status);
      }
    }

    if (!mostRecentRecord) {
      console.debug('[22] No matching records found in the most recent file');
      return true;
    }

    const currentPalletId = document.getElementById("palletNumber").value.trim();
    console.debug('[23] Current pallet ID:', currentPalletId);
    console.debug('[24] Record product ID:', mostRecentRecord["product ID"]);
    
    // Check if product IDs match
    if (mostRecentRecord["product ID"] !== currentPalletId) {
      console.debug('[25] Product ID mismatch detected');
      return false;
    }
    
    console.debug('[26] Product ID matches - proceeding');
    return true;
  } catch (error) {
    console.error('[ERROR] in checkFillingAuthority:', error);
    return true;
  }
}

  
  // 提交按钮点击事件
  submitButton.addEventListener("click", () => { // 主页面中的submit按钮
    if (!productName || !configData) return;    
    modal2.style.display = "flex";
  });

  // 显示 modal2 模态窗口
  const modal2 = document.getElementById("modal2");
  const modal2CloseIcon = document.getElementById("modal2CloseIcon"); // New close icon

  // Close icon event listener
    modal2CloseIcon.addEventListener("click", () => {
    modal2.style.display = "none";
    resetModal2Inputs();
  });

  // Add uppercase conversion for all Modal2 inputs
  const modal2Inputs = ['lineNumber', 'palletNumber', 'cartonCount', 'hcode', 'ubd'];
  modal2Inputs.forEach(inputId => convertToUpperCase(inputId));

  // click handler for modal2Message
  const modal2Message = document.getElementById("modal2Message");
  modal2Message.addEventListener("click", () => {
      modal2Message.textContent = "";
      modal2Message.style.display = "none"; // Optional: hide it after clearing
  });
  
  // modal2中的提交按钮点击事件
  const modalSubmitButton = document.getElementById("modalSubmitButton");
  
  modalSubmitButton.addEventListener("click", async () => {
    const lineNumber = document.getElementById("lineNumber").value;
    const palletNumber = document.getElementById("palletNumber").value;
    const cartonCount = document.getElementById("cartonCount").value;
    const hcode = document.getElementById("hcode").value;
    const ubd = document.getElementById("ubd").value;

    // 获取 modal2 的消息区域
    const modal2Message = document.getElementById("modal2Message");

    // 检查所有字段是否已填写
    if (!lineNumber || !palletNumber || !cartonCount || !hcode || !ubd) {      
      modal2Message.textContent = "Please fill in all fields.";
      modal2Message.style.display = "block";
      return;
    }
    
    if (scannedHCode !== hcode.toUpperCase()) {
      modal2Message.textContent = "Label hcode does not match the hcode on the pallet label. Please double check it!";
      modal2Message.style.display = "block";
      return;
    }
    
    // 验证 HCODE 格式
    const hcodeRegex = /^H\d{4}$/; // H 开头，后跟 4 位数字
    if (!hcodeRegex.test(hcode)) {
      modal2Message.textContent = "Invalid HCODE format. Please enter in the format HDDMM (e.g., H1903).";
      modal2Message.style.display = "block";
      return;
    }

    // 验证 UBD 格式
    const ubdRegex = /^\d{2}[A-Z]{3}$/; // NNMMM format (e.g., 01MAY)
    if (!ubdRegex.test(ubd)) {
        modal2Message.textContent = "Invalid UBD format. Please enter in the format NNMMM (e.g., 01MAY).";
        modal2Message.style.display = "block";
        return;
    }

    // 计算 HCODE 到 UBD 的天数
    const hcodeDate = parseHCODE(hcode); // 解析 HCODE 为日期
    const ubdDate = parseUBD(ubd); // 解析 UBD 为日期
    const daysDifference = Math.floor((ubdDate - hcodeDate) / (1000 * 60 * 60 * 24)); // 计算天数差

    // 如果不是整数，转换为整数
    if (!Number.isInteger(daysDifference)) {
      daysDifference = parseInt(daysDifference, 10);
      console.warn("daysDifference was not an integer, converted to:", daysDifference);
    }
    if (!Number.isInteger(shelfLifeDays)) {
      shelfLifeDays = parseInt(shelfLifeDays, 10);
      console.warn("shelfLifeDays was not an integer, converted to:", shelfLifeDays);
    }

    // 检查天数差是否等于保质期天数
    if (daysDifference !== shelfLifeDays) {
      // 显示提示信息
      modal2Message.textContent = `The difference between HCODE and UBD is ${daysDifference} days, which does not match the shelf life of ${shelfLifeDays} days. Please confirm HCODE and UBD.`;
      modal2Message.style.display = "block";
      return;
    } else {
      // 如果匹配，隐藏提示信息
      modal2Message.style.display = "none";
    }

    //如果当前要提交的产品不是Filling授权生产的产品，则返回
    console.log("submit button, isCheckingFillingAuthority =", isCheckingFillingAuthority ? "true" : "false")
    if(isCheckingFillingAuthority){
        console.log("going to call checkFillingAuthority")
        if(checkFillingAuthority(lineNumber,modal2Message)==false){
          // Show warning message      
          modal2Message.innerHTML = `
          <div style="color: red; text-align: left;">          
            <p>The product you are trying to submit:</p>
            <p><strong>${productName}</strong></p>
            <p> is not the one authorized by the filling department </p>
            <p>Please confirm with Filling department that this is the correct product being produced.</p>          
          </div>
        `;
        modal2Message.style.display = "block";
        console.log("modal2Message.innerHTML=",modal2Message.innerHTML)
        return;
      }
    }
      
    

    // 如果验证通过，提交数据
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

    const productRow = configData.find((row) => row[0] === productName);
    const submittedData = {
      timestamp: formattedTimestamp,
      productName,
      barcodes: headers.slice(1).map((header) => {
        const value = fields[header.toLowerCase()] || "";
        return `${value}` //`(${header})`; // 在值后添加备注，格式为 "值 (字段名)"
      }),
      lineNumber,
      palletNumber,
      cartonCount,
      hcode,
      ubd,
    };

    try {
      // const response =await fetch("/api/bolb-save", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(submittedData),
      // });

      // const response =await fetch("/api/index", {
      //  method: "POST",
      //  headers: { "Content-Type": "application/json" },
      //  body: JSON.stringify(submittedData),
      // });

      // if (!response.ok) {
      //  throw new Error(`HTTP error! status: ${response.status}`);
      // }
      // else{        
      //  console.log("提交成功-信息存储成功, response", response);
      // }


      const response2 =await fetch("/api/blob-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submittedData),
      });

      if (!response2.ok) {
        throw new Error(`HTTP error! status: ${response2.status}`);
      }
      else{        
        console.log("提交成功2");        
      }
      
      // 关闭 modal2
      const modal2 = document.getElementById("modal2");
      modal2.style.display = "none";

      // 提交成功后重置Modal2的文本框
      resetModal2Inputs(); 

      // 重置表单
      resetForm();

      // Show success message - NEW CODE
      showModalWithButtons("Data submitted successfully!", false);
      
    } catch (error) {
      console.error("Error submitting data:", error);
    }
  });

  // 解析 HCODE 为日期
  function parseHCODE(hcode) {
    const day = parseInt(hcode.slice(1, 3), 10); // 提取 DD
    const month = parseInt(hcode.slice(3, 5), 10) - 1; // 提取 MM（月份从 0 开始）
    const currentYear = new Date().getFullYear();
    return new Date(currentYear, month, day);
  }

  // 解析 UBD "DDMMM"
  function parseUBD(ubd) {
        const day = parseInt(ubd.slice(0, 2), 10); // First 2 digits
        const monthStr = ubd.slice(2, 5); // Last 3 letters
        const month = new Date(Date.parse(`01 ${monthStr} 2000`)).getMonth();
        const currentYear = new Date().getFullYear();
        return new Date(currentYear, month, day);
    }

  // 显示确认提示框
  function showConfirmationModal(message) {
    const modal = document.createElement("div");
    modal.style.position = "fixed";
    modal.style.top = "50%";
    modal.style.left = "50%";
    modal.style.transform = "translate(-50%, -50%)";
    modal.style.backgroundColor = "#ffcccc"; // 浅红色背景
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

    // 添加闪烁效果
    let isRed = true;
    const interval = setInterval(() => {
      modal.style.backgroundColor = isRed ? "#ffcccc" : "#ff9999";
      isRed = !isRed;
    }, 500);

    // 确认按钮点击事件
    document.getElementById("confirmButton").addEventListener("click", () => {
      clearInterval(interval);
      document.body.removeChild(modal);
    });

    // 取消按钮点击事件
    document.getElementById("cancelButton").addEventListener("click", () => {
      clearInterval(interval);
      document.body.removeChild(modal);
    });
  }

  // 初始化
  loadExcelFile();
});
