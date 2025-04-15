import { put, get, list } from "@vercel/blob"

// Generate formatted filename using the timestamp from the data
const getFormattedFileName = (data) => {
  console.log("Formatting filename from data:", data)

  // Extract the timestamp from the data
  const timestamp = data.timestamp || (data.data && data.data.timestamp)
  console.log("timestamp:", timestamp)

  if (!timestamp) {
    console.warn("No timestamp found in data, using current time")
    // Fallback to current time if no timestamp is found
    const options = {
      timeZone: 'Australia/Sydney',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    };
    const now = new Date()
    const sydneyDate = new Date(now.toLocaleString('en-US', options));    
    return getFormattedFileNameFromDate(sydneyDate, data)
  }

  // Parse the DD-MM-YYYY format correctly
  const [datePart, timePart] = timestamp.split(' ')
  const [day, month, year] = datePart.split('-')
  const [hours, minutes, seconds] = timePart.split(':')
  
  // Create date in YYYY-MM-DD format which Date can parse reliably
  const isoFormatted = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
  const date = new Date(isoFormatted)
  console.log("date=", date)

  return getFormattedFileNameFromDate(date, data)
}

// Helper function to format filename from a Date object and data
const getFormattedFileNameFromDate = (date, data) => {
  // Format the date components
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  const seconds = String(date.getSeconds()).padStart(2, "0")

  console.log("year=",year)
  console.log("month=",month)
  console.log("day=",day)
  

  // Handle both direct data object and nested data object
  const actualData = data.data || data

  // Access the barcodes array correctly
  const barcodes = actualData.barcodes || []
  const palletLabel =
    Array.isArray(barcodes) && barcodes.length >= 5
      ? barcodes[4] || "unknown" // palletLabel is the 5th item (index 4)
      : actualData.barcodes?.palletLabel || "unknown"

  const lineMap = {
    '1': 'L01', '2': 'L02', '3': 'L03', '4': 'L04',
    '5A': 'L5A', '5B': 'L5B', '6': 'L06', '7': 'L07',
    '8': 'L08', '9': 'L09', '10': 'L10', '11': 'L11',
    '12': 'L12', '13': 'L13', '14': 'L14', '15': 'L15'
  };

  const standardizedLine = lineMap[actualData.lineNumber.toUpperCase()];
  if (!standardizedLine) {
    console.error('[2] Invalid line number:', actualData.lineNumber);
    return true;
  }

  // Construct filename parts
  const fileNameParts = [
    `${day}-${month}-${year}`,    
    standardizedLine || "unknown",
    "Label-Check",
    palletLabel,
    actualData.productName || "unknown",
    actualData.hcode || "unknown",
    actualData.palletNumber || "unknown",
    actualData.cartonCount || "unknown",
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
        addRandomSuffix: true, // add suffix
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
