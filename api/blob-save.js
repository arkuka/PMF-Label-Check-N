import { put, get, list } from '@vercel/blob';

const getFormattedFileName = (data) => {
  // Create a date object with Sydney timezone
  const sydneyTime = new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney" })
  const sydneyDate = new Date(sydneyTime)

  // Format the date components
  const month = String(sydneyDate.getMonth() + 1).padStart(2, "0")
  const day = String(sydneyDate.getDate()).padStart(2, "0")
  const hours = String(sydneyDate.getHours()).padStart(2, "0")
  const minutes = String(sydneyDate.getMinutes()).padStart(2, "0")
  const seconds = String(sydneyDate.getSeconds()).padStart(2, "0")

  console.log("Sydney time:", sydneyTime)
  console.log("Formatting filename from data:", data)

  // Access the barcodes object correctly
  // Based on your frontend code, barcodes is an array of values corresponding to headers
  const palletLabel =
    data.barcodes && Array.isArray(data.barcodes)
      ? data.barcodes[4] || "unknown" // palletLabel is the 5th item (index 4)
      : data.barcodes?.palletLabel || "unknown"

  // Construct filename parts
  const fileNameParts = [
    `${month}${day}`,
    `${hours}${minutes}${seconds}`,
    data.lineNumber || "unknown",
    palletLabel,
    data.palletNumber || "unknown",
    data.boxCount || "unknown",
    data.hcode || "unknown",
    data.productName || "unknown",
  ]

  return `${fileNameParts.join("-")}.json`
}

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      // In Pages Router, req.body is already parsed if Content-Type is application/json
      const data = req.body

      // Log the received data to verify we have it
      console.log("Received data:", JSON.stringify(data, null, 2))

      // Generate a custom filename based on the data content
      const fileName = getFormattedFileName(data)
      console.log("Generated filename:", fileName)

      // Convert data to JSON string
      const jsonData = JSON.stringify(data, null, 2)

      // Save to Vercel Blob
      const blob = await put(fileName, jsonData, {
        contentType: "application/json",
        access: "public",
      })

      console.log(`Data saved successfully to ${fileName}: blob.url=`, blob.url)

      // Return success response
      return res.status(200).json({
        success: true,
        message: "Data saved successfully",
        url: blob.url,
        fileName,
      })
    } catch (error) {
      console.error("Failed to save data:", error)
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      })
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