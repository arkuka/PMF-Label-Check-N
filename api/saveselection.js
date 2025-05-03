import { put, list } from "@vercel/blob"
let lastReceivedDataCache = null;
let newData = null;

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const data = req.body;

      newData = JSON.stringify({        
        productionLine: data.productionLine,
        productionDate: data.productionDate,
        productName: data.productName,
        productID: data.productID,        
      });

      // Check if this data is identical to the last received data
      if (lastReceivedDataCache && lastReceivedDataCache === newData) {
        console.log("Received duplicate data, skipping save operation. data=",data);
        return res.status(200).json({
          success: true,
          message: "Duplicate data received, no action taken",
          skipped: true
        });
      }

      // Cache the new data
      lastReceivedDataCache = JSON.stringify({        
        productionLine: data.productionLine,
        productionDate: data.productionDate,
        productName: data.productName,
        productID: data.productID,        
      });
      
      console.log("Received data:", JSON.stringify(data, null, 2));

      const productionLine = data['production Line'] || "unknown";
      const productionDate = data['production Date'] || "unknown";
      const productName = data['product Name'] || "unknown";
      const productID = data['product ID'] || "unknown";      
      
      // Create a unique filename with timestamp
      
      const fileName = `${productionDate}-${productionLine}-Filling-Authority-${productID}-${productName}.json`;

      // Save the new data as a standalone file
      const jsonData = JSON.stringify([data], null, 2); // Wrap in array for consistency
      console.log("Data to save:", jsonData);

      const blob = await put(fileName, jsonData, {
        contentType: "application/json",
        access: "public",
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
    // If a specific production line and date are requested
    if (req.query.productionLine && req.query.productionDate) {
      try {
        const productionLine = req.query.productionLine;
        const productionDate = req.query.productionDate;
        
        // Find all blobs for this production line and date
        const { blobs } = await list();
        const prefix = `${productionDate}-${productionLine}-Filling-Authority`;
        const matchingBlobs = blobs.filter(blob => 
          blob.pathname.startsWith(prefix)
        );

        if (matchingBlobs.length === 0) {
          return res.status(404).json({
            success: false,
            message: `Cannot find production data for ${productionLine} on ${productionDate}`,
          });
        }

        // Return all files for this date and line (not just latest)
        const allData = [];
        
        for (const blob of matchingBlobs) {
          const response = await fetch(blob.url, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
          });
          
          if (response.ok) {
            const text = await response.text();
            try {
              const data = JSON.parse(text);
              // If the file contains an array, spread it, otherwise add the object
              if (Array.isArray(data)) {
                allData.push(...data);
              } else {
                allData.push(data);
              }
            } catch (e) {
              console.error(`Error parsing data from ${blob.pathname}:`, e);
            }
          }
        }

        return res.status(200).json({
          success: true,
          data: allData,
          fileCount: matchingBlobs.length,
        });
      } catch (error) {
        console.error("Get data failed:", error);
        return res.status(500).json({
          success: false,
          message: "Server error",
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
        
        // Group by production date and line
        const filesByDateAndLine = fillingAuthorityFiles.reduce((acc, blob) => {
          // Extract date and line from pathname
          const match = blob.pathname.match(/^(\d{2}-\d{2}-\d{4})-([^-]+)-/);
          if (match) {
            const date = match[1];
            const line = match[2];
            const key = `${date}-${line}`;
            
            if (!acc[key]) acc[key] = [];
            acc[key].push({
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
          filesByDateAndLine: filesByDateAndLine,
          totalFiles: fillingAuthorityFiles.length,
        });
      } catch (error) {
        console.error("List files failed:", error);
        return res.status(500).json({
          success: false,
          message: "Server error",
          error: error.message,
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Please provide production line and production date",
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: "Method not allowed",
    allowedMethods: ["POST", "GET"],
  });
}
