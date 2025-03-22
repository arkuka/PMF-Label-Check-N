import { put, get, list } from '@vercel/blob';

// 生成格式化的文件名
const getFormattedFileName = (data) => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  // 从 barcodes 数组中找到第一个非空的6位数字 barcode
  // const barcode = data.barcodes.find(b => b && b.length === 6) || 'unknown';
  
  console.log('data:', data);

  // 构建文件名
  const fileNameParts = [
    `${month}${day}`,
    `${hours}${minutes}${seconds}`,
    data.lineNumber || 'unknown',
    data.barcodes.palletLabel || 'unknown',
    data.palletNumber || 'unknown',
    data.boxCount || 'unknown',
    data.hcode || 'unknown',
    data.productName || 'unknown'
  ];
  
  return `${fileNameParts.join('-')}.json`;
};

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      // Parse the request body
      const body = await req.json()
  
      // Extract data - try both ways to get the data
      const data = body.data || body
  
      // Log the data to verify we have it
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
      return NextResponse.json({
        success: true,
        message: "Data saved successfully",
        url: blob.url,
        fileName,
      })
    } catch (error) {
      console.error("Failed to save data:", error)
      return NextResponse.json(
        {
          success: false,
          message: "Server error",
          error: error.message,
        },
        { status: 500 },
      )
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