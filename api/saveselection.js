import { put, list } from "@vercel/blob"

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const data = req.body;
      console.log("Received data:", JSON.stringify(data, null, 2));

      const productionLine = data['production Line'] || "unknown";
      const productionDate = data['production Date'] || "unknown";

      console.log("Production Date:", productionDate);
      
      // Find all blobs for this production line and date
      const { blobs } = await list();
      
      // Look for blobs with matching prefix
      const prefix = `${productionDate}-${productionLine}-Filling-Authority`;
      const matchingBlobs = blobs.filter(blob => 
        blob.pathname.startsWith(prefix)
      );
      
      console.log(`Found ${matchingBlobs.length} matching blobs with prefix: ${prefix}`);

      let existingData = [];
      
      if (matchingBlobs.length > 0) {
        // Sort by uploadedAt to get the most recent one
        const latestBlob = matchingBlobs.sort((a, b) => 
          new Date(b.uploadedAt) - new Date(a.uploadedAt)
        )[0];
        
        console.log("Latest blob found:", latestBlob);
        
        // Load existing data from the most recent blob
        const response = await fetch(latestBlob.url, { 
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (response.ok) {
          const text = await response.text();
          try {
            existingData = JSON.parse(text);
            console.log("Existing data loaded from latest blob:", existingData);
            // Ensure existingData is an array
            if (!Array.isArray(existingData)) {
              existingData = [existingData];
            }
          } catch (e) {
            console.error("Error parsing existing JSON:", e);
            existingData = [];
          }
        } else {
          console.error("Failed to fetch latest blob:", response.statusText);
        }
      }

      // Add new entry to the array
      existingData.push(data);
      const jsonData = JSON.stringify(existingData, null, 2);
      console.log("Final data to save:", jsonData);

      // Create a new filename with timestamp to ensure uniqueness
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${productionDate}-${productionLine}-Filling-Authority-${timestamp}.json`;

      // Save to Vercel Blob with a new filename
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

        // Sort by uploadedAt to get the most recent one
        const latestBlob = matchingBlobs.sort((a, b) => 
          new Date(b.uploadedAt) - new Date(a.uploadedAt)
        )[0];
        
        // Use fetch with no-cache to avoid caching issues
        const response = await fetch(latestBlob.url, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }
        
        const text = await response.text();
        const data = JSON.parse(text);

        return res.status(200).json({
          success: true,
          data: data,
          fileName: latestBlob.pathname,
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

        // For each group, only keep the most recent file
        const latestFiles = {};
        for (const [key, files] of Object.entries(filesByDateAndLine)) {
          const sortedFiles = files.sort((a, b) => 
            new Date(b.uploadedAt) - new Date(a.uploadedAt)
          );
          
          // Extract date and line from key
          const [date, line] = key.split('-');
          
          if (!latestFiles[line]) {
            latestFiles[line] = {};
          }
          
          latestFiles[line][date] = sortedFiles[0];
        }

        return res.status(200).json({
          success: true,
          filesByLine: latestFiles,
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