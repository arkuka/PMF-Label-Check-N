import { put, get, list } from '@vercel/blob';

// 获取当前日期前缀（格式：YYYYMMDD）
const getDatePrefix = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

// 查找或确定当天的唯一文件
const getDailyFileName = async (datePrefix) => {
  const { blobs } = await list();
  const matchingFiles = blobs.filter(blob => blob.pathname.startsWith(datePrefix));
  
  if (matchingFiles.length > 0) {
    // 始终使用最早创建的文件作为当天的唯一文件
    return matchingFiles.sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt))[0].pathname;
  }
  // 如果没有文件，返回基础文件名（Vercel 会添加后缀）
  return `${datePrefix}.json`;
};

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const data = req.body;
      const datePrefix = getDatePrefix();

      // 获取或确定当天的唯一文件名
      let fileName = await getDailyFileName(datePrefix);
      let existingData = [];

      // 如果文件已存在，读取其内容
      try {
        const existingBlob = await get(fileName);
        if (existingBlob) {
          const text = await existingBlob.text();
          existingData = JSON.parse(text);
        }
      } catch (e) {
        console.log(`无法读取文件 ${fileName}，将创建新文件`);
      }

      // 如果 existingData 不是数组，初始化为数组
      if (!Array.isArray(existingData)) {
        existingData = [];
      }

      // 将新数据追加到数组中
      existingData.push({
        data: data,
        timestamp: new Date().toISOString(),
      });

      // 将更新后的数据转换为 JSON 字符串
      const jsonData = JSON.stringify(existingData, null, 2);

      // 更新文件内容
      const blob = await put(fileName, jsonData, {
        contentType: "application/json",
        access: "public",
      });

      console.log(`数据保存成功到 ${fileName}: blob.url=`, blob.url);

      return res.status(200).json({
        success: true,
        message: "数据保存成功",
        url: blob.url,
        fileName,
      });
    } catch (error) {
      console.error("保存数据失败:", error);
      return res.status(500).json({
        success: false,
        message: "服务器错误",
        error: error.message,
      });
    }
  } else if (req.method === "GET") {
    try {
      const dateParam = req.query.date || getDatePrefix();
      if (!/^\d{8}$/.test(dateParam)) {
        return res.status(400).json({
          success: false,
          message: "日期格式错误，应为 YYYYMMDD",
        });
      }

      const fileName = await getDailyFileName(dateParam);
      const blob = await get(fileName);

      if (!blob) {
        return res.status(200).json({
          success: true,
          data: [],
          message: `日期 ${dateParam} 暂无数据`,
        });
      }

      const text = await blob.text();
      const data = JSON.parse(text);

      return res.status(200).json({
        success: true,
        data: data,
        fileName: fileName,
      });
    } catch (error) {
      console.error("获取数据失败:", error);
      return res.status(500).json({
        success: false,
        message: "服务器错误",
      });
    }
  } else if (req.method === "LIST") {
    try {
      const { blobs } = await list();
      
      return res.status(200).json({
        success: true,
        files: blobs.map(blob => ({
          url: blob.url,
          fileName: blob.pathname,
          size: blob.size,
          uploadedAt: blob.uploadedAt,
        })),
      });
    } catch (error) {
      console.error("列出文件失败:", error);
      return res.status(500).json({
        success: false,
        message: "服务器错误",
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: "方法不允许",
  });
}