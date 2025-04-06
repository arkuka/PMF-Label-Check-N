import { put, list } from "@vercel/blob"

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const data = req.body;
      console.log("Received data:", JSON.stringify(data, null, 2));

      const productionLine = data['production line'] || "unknown";
      const productionDate = data['production Date'] || "unknown";
      
      // Find existing blob for this production line
      let existingBlob = null;
      const { blobs } = await list();
      
      // Look for existing blob with matching prefix
      const prefix = `${productionDate}-${productionLine}-Filling-Authority`;
      existingBlob = blobs.find(blob => 
        blob.pathname.startsWith(prefix)
      );

      let fileName;
      let existingData = [];
      
      if (existingBlob) {
        fileName = existingBlob.pathname;
        // Load existing data - use fetch instead of get
        const response = await fetch(existingBlob.url);
        if (response.ok) {
          const text = await response.text();
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
          console.error("Failed to fetch existing blob:", response.statusText);
        }
      } else {
        // Create new filename
        fileName = `${productionDate}-${productionLine}-Filling-Authority.json`;
      }

      // Add new entry to the array
      existingData.push(data);
      const jsonData = JSON.stringify(existingData, null, 2);

      // Save to Vercel Blob with addRandomSuffix set to false if updating existing file
      const blob = await put(fileName, jsonData, {
        contentType: "application/json",
        access: "public",
        addRandomSuffix: false, // Don't add suffix
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
        const productionDate = req.query.productionDate;
        
        // Find the blob for this production line
        const { blobs } = await list();
        const prefix = `${productionLine}-Filling-Authority`;
        const blobInfo = blobs.find(blob => 
          blob.pathname.startsWith(prefix)
        );

        if (!blobInfo) {
          return res.status(404).json({
            success: false,
            message: `cannot found the production data of ${productionLine} on ${productionDate}`,
          });
        }

        // Use fetch instead of get
        const response = await fetch(blobInfo.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }
        
        const text = await response.text();
        const data = JSON.parse(text);

        return res.status(200).json({
          success: true,
          data: data,
          fileName: blobInfo.pathname,
        });
      } catch (error) {
        console.error("get data failed:", error);
        return res.status(500).json({
          success: false,
          message: "server error",
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
        console.error("list files failed:", error);
        return res.status(500).json({
          success: false,
          message: "server error",
          error: error.message,
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "please provide production line and production date",
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: "method not allowed",
    allowedMethods: ["POST", "GET"],
  });
}