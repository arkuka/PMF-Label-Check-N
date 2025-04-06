import { put, get, list } from "@vercel/blob"

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const data = req.body;
      console.log("Received data:", JSON.stringify(data, null, 2));

      const productionLine = data['production line'] || "unknown";
      
      // Find existing blob for this production line
      let existingBlob = null;
      const { blobs } = await list();
      
      // Look for existing blob with matching prefix
      // The issue is here - we need to match the exact format used when creating files
      const prefix = `${productionLine}-Filling-Authority`;
      existingBlob = blobs.find(blob => 
        blob.pathname.startsWith(prefix)
      );

      console.log("Existing blob found:", existingBlob);

      let fileName;
      let existingData = [];
      
      if (existingBlob) {
        fileName = existingBlob.pathname;
        // Load existing data
        const blob = await get(existingBlob.url); // Use URL instead of pathname
        const text = await blob.text();
        try {
          existingData = JSON.parse(text);
          // Ensure existingData is an array
          if (!Array.isArray(existingData)) {
            existingData = [existingData];
          }
        } catch (e) {
          console.error("Error parsing existing JSON:", e);
          existingData = [];
        }
      } else {
        // Create new filename
        fileName = `${productionLine}-Filling-Authority.json`;
      }

      // Add new entry to the array
      existingData.push(data);
      const jsonData = JSON.stringify(existingData, null, 2);

      // Save to Vercel Blob with addRandomSuffix set to false if updating existing file
      const blob = await put(fileName, jsonData, {
        contentType: "application/json",
        access: "public",
        addRandomSuffix: existingBlob ? false : true, // Don't add suffix if updating
      });

      console.log(`Data saved to ${blob.pathname}:`, blob.url);

      return res.status(200).json({
        success: true,
        message: "Data saved successfully",
        url: blob.url,
        fileName: blob.pathname,
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
    // If a specific production line is requested
    if (req.query.productionLine) {
      try {
        const productionLine = req.query.productionLine;
        
        // Find the blob for this production line
        const { blobs } = await list();
        const prefix = `${productionLine}-Filling-Authority`;
        const blobInfo = blobs.find(blob => 
          blob.pathname.startsWith(prefix)
        );

        if (!blobInfo) {
          return res.status(404).json({
            success: false,
            message: `没有找到生产线 ${productionLine} 的数据`,
          });
        }

        const blob = await get(blobInfo.url); // Use URL instead of pathname
        const text = await blob.text();
        const data = JSON.parse(text);

        return res.status(200).json({
          success: true,
          data: data,
          fileName: blobInfo.pathname,
        });
      } catch (error) {
        console.error("获取数据失败:", error);
        return res.status(500).json({
          success: false,
          message: "服务器错误",
          error: error.message,
        });
      }
    } 
    // If listing all files is requested
    else if (req.query.list === "true") {
      try {
        const { blobs } = await list();
        const fillingAuthorityFiles = blobs.filter(blob => 
          blob.pathname.includes('-Filling-Authority')
        );
        
        // Group by production line
        const filesByLine = fillingAuthorityFiles.reduce((acc, blob) => {
          const lineMatch = blob.pathname.match(/^(L\d{2})-/);
          if (lineMatch) {
            const line = lineMatch[1];
            if (!acc[line]) acc[line] = [];
            acc[line].push({
              url: blob.url,
              fileName: blob.pathname,
              size: blob.size,
              uploadedAt: blob.uploadedAt,
            });
          }
          return acc;
        }, {});

        return res.status(200).json({
          success: true,
          filesByLine,
        });
      } catch (error) {
        console.error("列出文件失败:", error);
        return res.status(500).json({
          success: false,
          message: "服务器错误",
          error: error.message,
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "请提供生产线编号 (如 L01, L02) 或设置 list=true 参数",
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: "方法不允许",
  });
}