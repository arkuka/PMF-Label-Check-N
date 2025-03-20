// 全局变量
let configData = null;
let productName = "";
let fields = {
  topLabel: "",
  sideLabel: "",
  bottomLabel: "",
  boxLabel: "",
  palletLabel: "",
  watermark: "",
};
let shelfLifeDays = 0; // 保质期天数
let headers = [];
let productNames = [];
let productNameLabel = "";
let isSubmitEnabled = false;
let prompted = false;
let showModal = false;
let possibleProduct = "";
let barcode = "";
let scannedBarcode = "";
let currentField = "";  // 用于记录当前输入的字段
let sannedHCode = ""

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
    boxLabel: productRow[headers.indexOf("boxLabel")] ? fields.boxLabel : "",
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
    boxLabel: "",
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

const showModalWithButtons = (message, showConfirmCancel = true, imageUrl = "") => {
  // 设置消息内容
  modalMessage.textContent = message;

  // 设置图片
  const modalImage = document.getElementById("modalImage");
  if (showConfirmCancel && imageUrl) {
    modalImage.src = imageUrl; // 设置图片链接
    modalImage.style.display = "block"; // 显示图片

    // 动态调整图片尺寸
    modalImage.onload = () => {
      const maxWidth = 500; // 最大宽度
      const maxHeight = 500; // 最大高度
      const width = modalImage.naturalWidth; // 图片原始宽度
      const height = modalImage.naturalHeight; // 图片原始高度

      // 如果图片尺寸超过限制，按比例缩放
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
    modalImage.style.display = "none"; // 隐藏图片
  }

  // 设置按钮显示状态
  if (showConfirmCancel) {
    // 显示 Confirm 和 Cancel 按钮
    modalConfirmButton.style.display = "inline-block";
    modalCancelButton.style.display = "inline-block";
    modalOkButton.style.display = "none";
  } else {
    // 显示 OK 按钮
    modalConfirmButton.style.display = "none";
    modalCancelButton.style.display = "none";
    modalOkButton.style.display = "inline-block";
  }

  // 显示模态窗口
  modal.style.display = "flex";
};


// 全局 handleInputChange 函数
const handleInputChange = (field, value, event) => {
     value = value.toUpperCase()
     value = value.trim()
    if (event.key === "Enter") {
      
      let processedScannedCode = value.trim();

      console.log("handleInputChange(); field=",field)
      console.log("handleInputChange(); value=",value)

      processedScannedCode = processScannedCode(value, field);
      
      fields[field] = processedScannedCode;
    
      if (!productName && value.trim() !== "") {
        // 查找是否有匹配的产品字段信息
          const matchingProduct = configData.find((row) => {
          const fieldIndex = headers.indexOf(field); // 获取当前字段的索引
          return row[fieldIndex] === processedScannedCode; // 检查当前字段的值是否匹配
        });
    
        if (matchingProduct && !prompted) {
          // 如果找到匹配的产品
          possibleProduct = matchingProduct[0];
          prompted = true;
          showModal = true;
          scannedBarcode = processedScannedCode; // 保存条码信息
          barcode = processedScannedCode;
          //modalMessage.textContent = `Do you want to start processing product: ${possibleProduct}?`;
          //modal.style.display = "flex";
          showModalWithButtons(`Do you want to start processing product: ${possibleProduct}?`, true, "");
        } else if (!matchingProduct) {
          // 如果没有找到匹配的产品
          possibleProduct = ""; // 设置为空，表示是错误提示
          showModalWithButtons("No matching product information found for this field.", false);
        }
      } else {
        // 如果 productName 已存在，则验证扫描信息
        validateScan(field, processedScannedCode);
      }

    //  validateScan(field, value);
    
    renderInputFields();

    // 设置当前输入字段
    currentField = field;

    // 设置焦点到下一个可用的输入框
    // const currentInput = event.target;
    // console.log("handleInputChange, currentInput=", currentInput);

    // 确保选择器匹配所有输入框
    // const allInputs = Array.from(document.querySelectorAll("#inputFields input[type='text']:not([disabled])"));

    // for (let ci = 0; ci < allInputs.length; ci++) {
    //    if (currentInput.id === allInputs[ci].id) {
    //      currentIndex = ci;
    //      break;
    //    }
    //  }

    // if (currentIndex !== -1) {
    //      const nextAvailableTextFieldIndex = currentIndex + 1;
    //      console.log("handleInputChange, nextAvailableTextFieldIndex=", nextAvailableTextFieldIndex);

    //      if (nextAvailableTextFieldIndex < allInputs.length) {
    //          allInputs[nextAvailableTextFieldIndex].focus();
    //        }
    //  } else {
    //      console.error("Current input not found in allInputs array.");
    //  }
  }
};

document.getElementById('resetButton').addEventListener('click', function() {
  // 重置表单逻辑
  resetForm()
});

const resetModal2Inputs = () => {
  document.getElementById("lineNumber").value = "";
  document.getElementById("palletNumber").value = "";
  document.getElementById("boxCount").value = "";
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
        const versionData = XLSX.utils.sheet_to_json(sheet2, { header: 1 });
        const versionInfo = versionData[1][0]; // 获取第二行第一列的值（A2）
    
        // 显示版本号
        const versionInfoElement = document.getElementById("versionInfo");
        if (versionInfoElement) {
          versionInfoElement.textContent = "ver:"+versionInfo;        
        }
      } catch (error) {
        console.error("Failed to load or parse the Excel file:", error);
      }
  };

  // 模态确认按钮
  modalConfirmButton.addEventListener("click", () => {
    productName = possibleProduct;
    updateFieldAvailability(possibleProduct);
    showModal = false;
    prompted = false;
    modal.style.display = "none";

    if (currentField) {
      fields[currentField] = scannedBarcode;  // 存储条码信息到用户输入的字段
    }

    // 更新下拉框中的选中值
    const productSelect = document.getElementById("productNameSelect");  // 假设下拉框的 id 是 "productName"
    if (productSelect) {
      productSelect.value = productName;  // 设置选中值
    }
    
    renderInputFields();

    isSubmitEnabled = allFieldsValid(); // 调用独立的 allFieldsValid 函数
    submitButton.disabled = !isSubmitEnabled;
  });

  // 模态取消按钮
  modalCancelButton.addEventListener("click", () => {
    showModal = false;
    prompted = false;
    modal.style.display = "none";
    resetForm();
  });

  modalOkButton.addEventListener("click", () => {
    // 关闭模态窗口
    showModal = false;
    modal.style.display = "none";
  
    // 重置表单
    resetForm();
  });

  // 获取 Close 按钮
  const modal2CloseButton = document.getElementById("modal2CloseButton");

  // 添加点击事件
  modal2CloseButton.addEventListener("click", () => {
    const modal2 = document.getElementById("modal2");
    modal2.style.display = "none"; // 隐藏 modal2
    resetModal2Inputs(); // 重置 modal2 中的输入框
  });

  // 提交按钮点击事件
  submitButton.addEventListener("click", () => { // 主页面中的submit按钮
    if (!productName || !configData) return;

    // 显示 modal2 模态窗口
    const modal2 = document.getElementById("modal2");
    modal2.style.display = "flex";
  });

  // modal2中的提交按钮点击事件
  const modalSubmitButton = document.getElementById("modalSubmitButton");

  modalSubmitButton.addEventListener("click", async () => {
    const lineNumber = document.getElementById("lineNumber").value;
    const palletNumber = document.getElementById("palletNumber").value;
    const boxCount = document.getElementById("boxCount").value;
    const hcode = document.getElementById("hcode").value;
    const ubd = document.getElementById("ubd").value;

    // 获取 modal2 的消息区域
    const modal2Message = document.getElementById("modal2Message");

    // 检查所有字段是否已填写
    if (!lineNumber || !palletNumber || !boxCount || !hcode || !ubd) {      
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
    const ubdRegex = /^\d{2} [A-Z]{3}$/; // DD MMM 格式
    if (!ubdRegex.test(ubd)) {
      modal2Message.textContent = "Invalid UBD format. Please enter in the format DD MMM (e.g., 19 MAY).";
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

    // 如果验证通过，提交数据
    const productRow = configData.find((row) => row[0] === productName);
    const submittedData = {
      productName,
      barcodes: headers.slice(1).map((header) => fields[header.toLowerCase()] || ""),
      timestamp: new Date().toLocaleString("en-US", { timeZone: "Australia/Sydney" }),
      lineNumber,
      palletNumber,
      boxCount,
      hcode,
      ubd,
    };

    try {
      // const response =await fetch("/api/bolb-save", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(submittedData),
      // });

      const response =await fetch("/api/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submittedData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      else{        
        console.log("提交成功-信息存储成功, response", response);
      }


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

  // 解析 UBD 为日期
  function parseUBD(ubd) {
    const [day, monthStr] = ubd.split(" ");
    const month = new Date(Date.parse(`01 ${monthStr} 2000`)).getMonth(); // 将 MMM 转换为月份
    const currentYear = new Date().getFullYear();
    return new Date(currentYear, month, parseInt(day, 10));
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
    modal.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.1)";
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
