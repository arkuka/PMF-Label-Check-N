const XLSX = require('xlsx');

module.exports = async (req, res) => {
    try {
        const response = await fetch('/label_library.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        res.status(200).json({ data });
    } catch (error) {
        res.status(500).json({ error: 'Failed to load label_library.xlsx' });
    }
};