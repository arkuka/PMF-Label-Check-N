const XLSX = require('xlsx');

module.exports = async (req, res) => {
    const workbook = XLSX.readFile('production_lines.xlsx');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    const lines = data.map(row => ({
        name: row['Production Lines'],
        note1: row['Comment 1'],
        note2: row['Comment 2']
    }));
    
    res.json(lines);
};