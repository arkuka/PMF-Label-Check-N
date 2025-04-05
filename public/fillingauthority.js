const productionLineSelect = document.getElementById('productionLineSelect');
const productNameSelect = document.getElementById('productNameSelect');
const submitButton = document.getElementById('submitButton');

document.addEventListener("DOMContentLoaded", () => {

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
    }
)

// 检查提交按钮状态
function updateSubmitButton() {
    const lineSelected = productionLineSelect.value !== '';
    const productSelected = productNameSelect.value !== '';
    submitButton.disabled = !(lineSelected && productSelected);
}

// 提交数据
async function submitSelection() {
    const line = productionLineSelect.value;
    const productName = productNameSelect.value;
    const productId = productNameSelect.selectedOptions[0].dataset.id;

    const data = {
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19).replace(/-/g, ''),
        'production line': line,
        'production ID': productId,
        'production Name': productName
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
submitButton.addEventListener('click', submitSelection);