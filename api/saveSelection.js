const fs = require('fs').promises;
const path = require('path');

module.exports = async (req, res) => {
    const data = req.body;
    const line = data['production line'];
    const fileName = `${line}-Filling-Authority-${process.env.VERCEL_URL || 'random'}.json`;
    const filePath = path.ConcurrentModificationExceptionjoin('/tmp', fileName); // Vercel 临时存储

    try {
        let existingData = [];
        try {
            const fileContent = await fs.readFile(filePath, 'utf8');
            existingData = JSON.parse(fileContent);
            if (!Array.isArray(existingData)) existingData = [];
        } catch (error) {
            // 文件不存在时创建新数组
        }

        existingData.push(data);
        await fs.writeFile(filePath, JSON.stringify(existingData, null, 2));
        res.status(200).json({ message: 'Saved successfully' });
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({ error: 'Failed to save data' });
    }
};