const fs = require('fs');
const path = require('path');

// Directory where JSON files will be stored
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

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

module.exports = async function handler(req, res) {
    if (req.method === "POST") {
        try {
            const data = req.body;

            // Log the received data to verify we have it
            console.log("Received data:", JSON.stringify(data, null, 2));

            // Generate a custom filename based on the data content
            const fileName = getFormattedFileName(data);
            console.log("Generated filename:", fileName);

            // Convert data to JSON string
            const jsonData = JSON.stringify(data, null, 2);

            // Save to file
            const filePath = path.join(DATA_DIR, fileName);
            fs.writeFileSync(filePath, jsonData);

            console.log(`Data saved successfully to ${filePath}`);

            // Return success response
            return res.status(200).json({
                success: true,
                message: "Data saved successfully",
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
                    message: "Please provide a filename",
                });
            }

            const filePath = path.join(DATA_DIR, fileName);
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({
                    success: false,
                    message: `File ${fileName} does not exist`,
                });
            }

            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(fileContent);

            return res.status(200).json({
                success: true,
                data: data,
                fileName: fileName,
            });
        } catch (error) {
            console.error("Failed to get data:", error);
            return res.status(500).json({
                success: false,
                message: "Server error",
            });
        }
    } else if (req.method === "LIST") {
        try {
            const files = fs.readdirSync(DATA_DIR);
            const fileDetails = files.map(file => {
                const stats = fs.statSync(path.join(DATA_DIR, file));
                return {
                    fileName: file,
                    size: stats.size,
                    modifiedAt: stats.mtime,
                };
            });
            
            return res.status(200).json({
                success: true,
                files: fileDetails,
            });
        } catch (error) {
            console.error("Failed to list files:", error);
            return res.status(500).json({
                success: false,
                message: "Server error",
            });
        }
    }

    return res.status(405).json({
        success: false,
        message: "Method not allowed",
    });
};