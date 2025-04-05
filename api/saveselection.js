import { put, get, list } from "@vercel/blob"

// Generate formatted filename using the timestamp from the data
const getFormattedFileName = (data) => {
    const timestamp = data.timestamp;
    const date = new Date(timestamp);
    
    // Format the date components
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    // Construct filename parts
    const fileNameParts = [
        `${year}${month}${day}`,
        `${hours}${minutes}${seconds}`,
        data['production line'] || "unknown",
        data['production ID'] || "unknown",
        data['production Name'] || "unknown"
    ];

    return `${fileNameParts.join("-")}.json`;
};

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
  