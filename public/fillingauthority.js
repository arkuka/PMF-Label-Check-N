const productionLineSelect = document.getElementById('productionLineSelect');
const productNameSelect = document.getElementById('productNameSelect');
const submitButton = document.getElementById('submitButton');
const yesterdayDateRadio = document.getElementById('yesterdayDate');
const todayDateRadio = document.getElementById('todayDate');

// Function to format date as YYYY-MM-DD
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Set up date radio buttons
function setupDateSelection() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    todayDateRadio.value = formatDate(today);
    yesterdayDateRadio.value = formatDate(yesterday);
    
    // Set today as default selected
    todayDateRadio.checked = true;
}

document.addEventListener("DOMContentLoaded", () => {
    setupDateSelection();
    
    const loadExcelFile = async () => {
        try {
            const response = await fetch("/label_library.xlsx");
            const arrayBuffer = await response.arrayBuffer();
    
            const workbook = XLSX.read(arrayBuffer, { type: "array" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
            console.log(data); // Log the data to see its structure
    
            const products = data.slice(1).map(row => ({
                name: row[0],
                id: row[5] // pallet label as ID
            }));
    
            productNameSelect.innerHTML = '<option value="">Select Product</option>' +
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
    
            console.log(data); // Log the data to see its structure
    
            const production_lines = data.slice(1).map(row => ({
                name: row[0],
                id: row[1]
            }));
    
            productionLineSelect.innerHTML = '<option value="">Select Production Line</option>' +
                production_lines.map(production_line => `<option value="${production_line.name}" data-id="${production_line.id}">${production_line.name}</option>`).join('');

        } catch (error) {
            console.error("Failed to load or parse the Excel file:", error);
        }
    }
    
    loadExcelFile();
});

// 检查提交按钮状态
function updateSubmitButton() {
    const lineSelected = productionLineSelect.value !== '';
    const productSelected = productNameSelect.value !== '';
    const dateSelected = document.querySelector('input[name="productionDate"]:checked').value !== '';
    
    submitButton.disabled = !(lineSelected && productSelected && dateSelected);
}

// 提交数据
async function submitSelection() {
    const line = productionLineSelect.value;
    const productName = productNameSelect.value;
    const productId = productNameSelect.selectedOptions[0].dataset.id;
    const productionDate = document.querySelector('input[name="productionDate"]:checked').value;

    const data = {
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19).replace(/-/g, ''),
        'production line': line,
        'production ID': productId,
        'production Name': productName,
        'production Date': productionDate
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
        alert('Selection saved successfully!');
        productionLineSelect.value = '';
        productNameSelect.value = '';
        submitButton.disabled = true;

    } catch (error) {
        console.error('Error saving selection:', error);
        alert('Failed to save selection. Please try again.');
    }
}

// 事件监听
productionLineSelect.addEventListener('change', updateSubmitButton);
productNameSelect.addEventListener('change', updateSubmitButton);
document.querySelectorAll('input[name="productionDate"]').forEach(radio => {
    radio.addEventListener('change', updateSubmitButton);
});
submitButton.addEventListener('click', submitSelection);