import { put, get, list, del } from "@vercel/blob"; // 添加 del 导入

// Generate formatted filename using the timestamp from the data
const getFormattedFileName = (data) => {
  console.log("Formatting filename from data:", data);

  const timestamp = data.timestamp || (data.data && data.data.timestamp);

  if (!timestamp) {
    console.warn("No timestamp found in data, using current time");
    const options = {
      timeZone: "Australia/Sydney",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    };
    const now = new Date();
    const sydneyDate = new Date(now.toLocaleString("en-US", options));
    return getFormattedFileNameFromDate(sydneyDate, data);
  }

  const date = new Date(timestamp);
  return getFormattedFileNameFromDate(date, data);
};

// Helper function to format filename from a Date object and data
const getFormattedFileNameFromDate = (date, data) => {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  const actualData = data.data || data;
  const barcodes = actualData.barcodes || [];
  const palletLabel =
    Array.isArray(barcodes) && barcodes.length >= 5
      ? barcodes[4] || "unknown"
      : actualData.barcodes?.palletLabel || "unknown";

  const fileNameParts = [
    `${year}${month}${day}`,
    `${hours}${minutes}${seconds}`,
    actualData.lineNumber || "unknown",
    palletLabel,
    actualData.palletNumber || "unknown",
    actualData.cartonCount || "unknown",
    actualData.hcode || "unknown",
    actualData.productName || "unknown",
  ];

  return `${fileNameParts.join("-")}.json`;
};

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const data = req.body;
      console.log("Received data:", JSON.stringify(data, null, 2));

      const fileName = getFormattedFileName(data);
      console.log("Generated filename:", fileName);

      const jsonData = JSON.stringify(data, null, 2);
      const blob = await put(fileName, jsonData, {
        contentType: "application/json",
        access: "public",
      });

      console.log(`Data saved successfully to ${fileName}: blob.url=`, blob.url);

      return res.status(200).json({
        success: true,
        message: "Data saved successfully",
        url: blob.url,
        fileName,
      });
    } catch (error) {
      console.error("Failed to save data:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  } else if (req.method === "GET") {
    try {
      const fileName = req.query.fileName;
      if (!fileName) {
        return res.status(400).json({
          success: false,
          message: "请提供文件名",
        });
      }

      const blob = await get(fileName);
      if (!blob) {
        return res.status(404).json({
          success: false,
          message: `文件 ${fileName} 不存在`,
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
        files: blobs.map((blob) => ({
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
  } else if (req.method === "DELETE") { // 新增 DELETE 方法
    try {
      const fileName = req.query.fileName; // 从查询参数获取文件名
      if (!fileName) {
        return res.status(400).json({
          success: false,
          message: "请提供文件名",
        });
      }

      // 使用 del 方法删除文件
      await del(fileName);
      console.log(`文件 ${fileName} 已成功删除`);

      return res.status(200).json({
        success: true,
        message: `文件 ${fileName} 已成功删除`,
        fileName,
      });
    } catch (error) {
      console.error("删除文件失败:", error);
      return res.status(500).json({
        success: false,
        message: "服务器错误",
        error: error.message,
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: "方法不允许",
  });
}
