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
      const prefix = `${productionLine}-Filling-Authority-`;
      existingBlob = blobs.find(blob => 
        blob.pathname.startsWith(prefix)
      );

      console.log("Existing blob found:", existingBlob);

      let fileName;
      let existingData = [];
      
      if (existingBlob) {
        fileName = existingBlob.pathname;
        // Load existing data
        const blob = await get(fileName);
        const text = await blob.text();
        existingData = JSON.parse(text);
        // Ensure existingData is an array
        if (!Array.isArray(existingData)) {
          existingData = [existingData];
        }
      } else {
        // Create new filename with Vercel's random string
        fileName = `${productionLine}-Filling-Authority.json`;
      }

      // Add new entry to the array
      existingData.push(data);
      const jsonData = JSON.stringify(existingData, null, 2);

      // Save to Vercel Blob (will automatically add random string to filename)
      const blob = await put(fileName, jsonData, {
        contentType: "application/json",
        access: "public",
      });

      console.log(`Data saved to ${blob.pathname}:`, blob.url);

      return res.status(200).json({
        success: true,
        message: "Data saved successfully",
        url: blob.url,
        fileName: blob.pathname, // Use the actual blob pathname
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
      const productionLine = req.query.productionLine;
      if (!productionLine) {
        return res.status(400).json({
          success: false,
          message: "请提供生产线编号 (如 L01, L02)",
        });
      }

      // Find the blob for this production line
      const { blobs } = await list();
      const prefix = `${productionLine}-Filling-Authority-`;
      const blobInfo = blobs.find(blob => 
        blob.pathname.startsWith(prefix)
      );

      if (!blobInfo) {
        return res.status(404).json({
          success: false,
          message: `没有找到生产线 ${productionLine} 的数据`,
        });
      }

      const blob = await get(blobInfo.pathname);
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
      });
    }
  } else if (req.method === "LIST") {
    try {
      const { blobs } = await list();
      const fillingAuthorityFiles = blobs.filter(blob => 
        blob.pathname.includes('-Filling-Authority-')
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
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: "方法不允许",
  });
}