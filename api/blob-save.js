import { put, list, del } from "@vercel/blob"

export default async function handler(req, res) {
  console.log('ak: server receoved a request with method:', req.method)
  
  // 获取当前日期作为文件名（格式：YYYYMMDD）
  const getDateFileName = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}${month}${day}.json`;
  }

  if (req.method === "POST") {
    try {
      const data = req.body
      const fileName = getDateFileName()

      // 尝试获取现有文件内容
      let existingData = [];
      try {
        const existingBlob = await get(fileName);
        if (existingBlob) {
          const text = await existingBlob.text();
          existingData = JSON.parse(text);
        }
      } catch (e) {
        // 如果文件不存在，则 existingData 保持为空数组
        console.log('No existing file found, creating new one');
      }

      // 将新数据追加到现有数据中
      existingData.push(data);
      const jsonData = JSON.stringify(existingData, null, 2);

      // 保存到 Vercel Blob
      const blob = await put(fileName, jsonData, {
        contentType: "application/json",
        access: "public",
      })

      console.log("数据保存成功: blob.url=", blob.url)

      return res.status(200).json({
        success: true,
        message: "数据保存成功",
        url: blob.url,
        fileName,
      })
    } catch (error) {
      console.error("保存数据失败:", error)
      return res.status(500).json({
        success: false,
        message: "服务器错误",
      })
    }
  } else if (req.method === "GET") {
    try {
      // 列出所有 Blob
      const { blobs } = await list()

      return res.status(200).json({
        success: true,
        files: blobs.map((blob) => ({
          url: blob.url,
          pathname: blob.pathname,
          size: blob.size,
          uploadedAt: blob.uploadedAt,
        })),
      })
    } catch (error) {
      console.error("获取数据失败:", error)
      return res.status(500).json({
        success: false,
        message: "服务器错误",
      })
    }
  } else if (req.method === "DELETE") {
    try {
      const { pathname } = req.body

      if (!pathname) {
        return res.status(400).json({
          success: false,
          message: "缺少 pathname 参数",
        })
      }

      // 删除 Blob
      await del(pathname)

      return res.status(200).json({
        success: true,
        message: "文件删除成功",
      })
    } catch (error) {
      console.error("删除文件失败:", error)
      return res.status(500).json({
        success: false,
        message: "服务器错误",
      })
    }
  }

  return res.status(405).json({
    success: false,
    message: "方法不允许",
  })
}
