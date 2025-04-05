const XLSX = require('xlsx');

module.exports = async (req, res) => {
    try {
        const response = await fetch('/production_lines.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);
        
        const lines = data.map(row => ({
            name: row['Production Lines'] || Object.values(row)[0],
            note1: row['Comment 1'] || Object.values(row)[1],
            note2: row['Comment 2'] || Object.values(row)[2]
        }));
        
        res.status(200).json(lines);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load production_lines.xlsx' });
    }
};