const XLSX = require('xlsx');

module.exports = async (req, res) => {
    const workbook = XLSX.readFile('production_lines.xlsx');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    const lines = data.map(row => ({
        name: row['生产线名字'],
        note1: row['备注信息1'],
        note2: row['备注信息2']
    }));
    
    res.json(lines);
};