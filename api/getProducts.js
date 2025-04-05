const XLSX = require('xlsx');

module.exports = async (req, res) => {
    const workbook = XLSX.readFile('label_library.xlsx');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    res.json(data);
};