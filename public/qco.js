// 全局变量
let configData = null;
let productName = "";
let fields = {
  topLabel: "",
  sideLabel: "",
  bottomLabel: "",
  boxLabel: "",
  palletLabel: "",
};
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

// 全局函数
const validateScan = (field, scannedCode) => {
    if (!configData || !productName) return;
  
  const productRow = configData.find((row) => row[0] === productName);
  if (!productRow) return;
  
  const fieldIndex = headers.indexOf(field);
  const correctCode = productRow[fieldIndex];
  const isMatch = scannedCode.trim() === correctCode;  
  checkSubmitAvailability(isMatch);
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

  const allFieldsValid = headers.slice(1).every((field) => {
    const fieldIndex = headers.indexOf(field);
    if (isFieldDisabled(field)) return true;

    const fieldValue = fields[field.toLowerCase()] || "";
    const correctCode = productRow[fieldIndex];
    
    return fieldValue.trim() === correctCode;
  });

  isSubmitEnabled = allFieldsValid;  
  submitButton.disabled = !isSubmitEnabled;  
};

const isFieldDisabled = (field) => {
  if (!productName) return false;
  if (!configData) return false;
  const productRow = configData.find((row) => row[0] === productName);
  const fieldIndex = headers.indexOf(field);
  return !productRow || !productRow[fieldIndex];
};

const getInputBackgroundColor = (field) => {
  if (!configData || !productName) return "#FFFFFF";

  const fieldValue = fields[field] || "";
  const productRow = configData.find((row) => row[0] === productName);
  const fieldIndex = headers.findIndex((header) => header.toLowerCase() === field);

  if (fieldIndex === -1 || !productRow || !productRow[fieldIndex]) return "#DDDDDD";
  if (fieldValue === "") return "#F0B9B9";

  const correctCode = productRow[fieldIndex];
  return fieldValue === correctCode ? "#d3f8d3" : "#F0B9B9";
};

const getFieldIcon = (field) => {
  const fieldValue = fields[field] || "";
  if (fieldValue === "") return "";

  const productRow = configData.find((row) => row[0] === productName);
  const fieldIndex = headers.findIndex((header) => header.toLowerCase() === field);
  const correctCode = productRow ? productRow[fieldIndex] : "";

  return fieldValue === correctCode ? '<span style="color: green">✅</span>' : '<span style="color: red">❌</span>';
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
  };
};

const resetForm = () => {
  productName = "";
  fields = {
    topLabel: "",
    sideLabel: "",
    bottomLabel: "",
    boxLabel: "",
    palletLabel: "",
  };
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
    if (event.key === "Enter") {
      fields[field] = value;
    
      if (!productName && value.trim() !== "") {
        // 查找是否有匹配的产品字段信息
          const matchingProduct = configData.find((row) => {
          const fieldIndex = headers.indexOf(field); // 获取当前字段的索引
          return row[fieldIndex] === value.trim(); // 检查当前字段的值是否匹配
        });
    
        if (matchingProduct && !prompted) {
          // 如果找到匹配的产品
          possibleProduct = matchingProduct[0];
          prompted = true;
          showModal = true;
          scannedBarcode = value.trim(); // 保存条码信息
          barcode = value;
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
        validateScan(field, value);
      }

    //validateScan(field, value);
    
    renderInputFields();

    // 设置当前输入字段
    currentField = field;

    // 设置焦点到下一个可用的输入框
    const currentInput = event.target;
    console.log("handleInputChange, currentInput=", currentInput);

    // 确保选择器匹配所有输入框
    const allInputs = Array.from(document.querySelectorAll("#inputFields input[type='text']:not([disabled])"));

    for (let ci = 0; ci < allInputs.length; ci++) {
      if (currentInput.id === allInputs[ci].id) {
          currentIndex = ci;
          break;
      }
    }

    if (currentIndex !== -1) {
      const nextAvailableTextFieldIndex = currentIndex + 1;
      console.log("handleInputChange, nextAvailableTextFieldIndex=", nextAvailableTextFieldIndex);

      if (nextAvailableTextFieldIndex < allInputs.length) {
        allInputs[nextAvailableTextFieldIndex].focus();
      }
    } else {
      console.error("Current input not found in allInputs array.");
    }
  }
};

document.getElementById('resetButton').addEventListener('click', function() {
  // 重置表单逻辑
  resetForm()
});

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
      const response = await fetch("public/label_library.xlsx");
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
    console.log('productSelect=',productSelect)
    if (productSelect) {
      console.log('productSelect.Value=',productName)
      productSelect.value = productName;  // 设置选中值
    }
    
    renderInputFields();
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

  // 提交按钮
  submitButton.addEventListener("click", async () => {
    if (!productName || !configData) return;

    const productRow = configData.find((row) => row[0] === productName);
    const submittedData = {
      productName,
      barcodes: headers.slice(1).map((header) => fields[header.toLowerCase()] || ""),
      timestamp: new Date().toISOString(),
    };

    try {
      await fetch("/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submittedData),
      });

      resetForm();
    } catch (error) {
      console.error("Error submitting data:", error);
    }
  });

  // 初始化
  loadExcelFile();
});
