import { list, get, del } from "@vercel/blob"

export default async function handler(req, res) {
  if (req.method === "GET" && req.query.method === "LIST") {
    try {
      const { blobs } = await list()
      return res.status(200).json({
        success: true,
        files: blobs.map((blob) => ({
          url: blob.url,
          fileName: blob.pathname,
          size: blob.size,
          uploadedAt: blob.uploadedAt,
        })),
      })
    } catch (error) {
      console.error("列出文件失败:", error)
      return res.status(500).json({ success: false, message: "服务器错误" })
    }
  } else if (req.method === "GET") {
    try {
      const dateParam = req.query.date
      if (!dateParam || !/^\d{8}$/.test(dateParam)) {
        return res.status(400).json({ success: false, message: "日期格式错误，应为 YYYYMMDD" })
      }
      const { blobs } = await list()
      const file = blobs.find((blob) => blob.pathname.startsWith(dateParam))
      if (!file) {
        return res.status(200).json({ success: true, data: [], message: `日期 ${dateParam} 暂无数据` })
      }
      const blob = await get(file.pathname)
      const text = await blob.text()
      const data = JSON.parse(text)
      return res.status(200).json({ success: true, data, fileName: file.pathname })
    } catch (error) {
      console.error("获取数据失败:", error)
      return res.status(500).json({ success: false, message: "服务器错误" })
    }
  } else if (req.method === "DELETE") {
    try {
      const fileName = req.query.fileName
      if (!fileName) {
        return res.status(400).json({
          success: false,
          message: "请提供文件名",
        })
      }

      // First, we need to find the blob URL by its pathname
      const { blobs } = await list({
        prefix: fileName,
        limit: 1,
      })

      if (blobs.length === 0) {
        return res.status(404).json({
          success: false,
          message: `文件 ${fileName} 不存在`,
        })
      }

      // Now we have the blob URL, we can delete it
      await del(blobs[0].url)
      console.log(`文件 ${fileName} 已成功删除`)

      return res.status(200).json({
        success: true,
        message: `文件 ${fileName} 已成功删除`,
        fileName,
      })
    } catch (error) {
      console.error("删除文件失败:", error)
      return res.status(500).json({
        success: false,
        message: "服务器错误",
        error: error.message,
      })
    }
  }

  return res.status(405).json({ success: false, message: "方法不允许" })
}

