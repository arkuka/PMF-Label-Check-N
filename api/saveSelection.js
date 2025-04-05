const fs = require('fs').promises;
const path = require('path');

module.exports = async (req, res) => {
    const data = req.body;
    const line = data['production line'];
    const fileName = `L${line.padStart(2, '0')}-Filling-Authority-${process.env.VERCEL_URL || 'random'}.json`;
    const filePath = path.join('/tmp', fileName); // Vercel上的临时存储

    try {
        let existingData = [];
        try {
            const fileContent = await fs.readFile(filePath, 'utf8');
            existingData = JSON.parse(fileContent);
            if (!Array.isArray(existingData)) {
                existingData = [];
            }
        } catch (error) {
            // 文件不存在时创建新数组
        }

        existingData.push(data);
        await fs.writeFile(filePath, JSON.stringify(existingData, null, 2));
        res.status(200).json({ message: '保存成功' });
    } catch (error) {
        res.status(500).json({ error: '保存失败' });
    }
};