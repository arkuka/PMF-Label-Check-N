import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const data = req.body;
      const datePrefix = getDatePrefix(); // 如 '20250320'

      // 读取现有数据
      let existingData = (await kv.get(datePrefix)) || [];
      if (!Array.isArray(existingData)) existingData = [];

      // 追加新数据
      existingData.push({
        data: data,
        timestamp: new Date().toISOString(),
      });

      // 保存回 KV
      await kv.set(datePrefix, existingData);

      return res.status(200).json({
        success: true,
        message: "数据保存成功",
        date: datePrefix,
      });
    } catch (error) {
      console.error("保存数据失败:", error);
      return res.status(500).json({ success: false, message: "服务器错误" });
    }
  }
  // GET 和其他方法保持不变
}

const getDatePrefix = () => {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
};