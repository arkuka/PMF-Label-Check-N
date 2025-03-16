import { put, list, del } from "@vercel/blob"

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const data = req.body

      // 生成文件名
      const fileName = `data-${Date.now()}.json`

      // 将数据转换为 JSON 字符串
      const jsonData = JSON.stringify(data, null, 2)

      // 保存到 Vercel Blob
      const blob = await put(fileName, jsonData, {
        contentType: "application/json",
      })

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

