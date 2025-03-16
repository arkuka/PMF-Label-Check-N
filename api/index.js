// Simple in-memory counter
let count = 0

module.exports = (req, res) => {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  // Handle OPTIONS request (for CORS preflight)
  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  if (req.method === "GET") {
    return res.status(200).json({ count })
  }

  if (req.method === "POST") {
    // count++
    // return res.status(200).json({ count })

    const submittedData = req.body;

    console.log(`Server received post request:${submittedData}`);

  }

  return res.status(405).json({ error: "Method not allowed" })
}

///////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////


// const express = require('express');
// const fs = require('fs');
// const path = require('path');
// const XLSX = require('xlsx');
// const app = express();
// const port = 3000;

// // 中间件，用于解析 JSON 请求体
// app.use(express.json());

// // 存储提交数据的 Excel 文件路径
// const excelFilePath = path.join(__dirname, 'submissions.xlsx');

// // 初始化 Excel 文件（如果文件不存在）
// const initializeExcelFile = () => {
//   if (!fs.existsSync(excelFilePath)) {
//     const headers = [['Product Name', 'Top Label', 'Side Label', 'Bottom Label', 'Box Label', 'Pallet Label', 'Timestamp']];
//     const worksheet = XLSX.utils.aoa_to_sheet(headers);
//     const workbook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workbook, worksheet, 'Submissions');
//     XLSX.writeFile(workbook, excelFilePath);
//   }
// };

// // 初始化 Excel 文件
// initializeExcelFile();

// // 处理 POST 请求
// app.post('/submit', (req, res) => {
//   const submittedData = req.body;

//   console.log(`Server received post request:${submittedData}`);

//   // 读取现有的 Excel 文件
//   const workbook = XLSX.readFile(excelFilePath);
//   const worksheet = workbook.Sheets['Submissions'];

//   // 将新数据添加到工作表中
//   const newRow = [
//     submittedData.productName,
//     ...submittedData.barcodes,
//     submittedData.timestamp
//   ];
//   XLSX.utils.sheet_add_aoa(worksheet, [newRow], { origin: -1 });

//   // 写入更新后的 Excel 文件
//   XLSX.writeFile(workbook, excelFilePath);

//   // 返回成功响应
//   res.status(200).json({ message: 'Data submitted successfully!' });
// });

// // 启动服务器
// app.listen(port, () => {
//   console.log(`Server is running on http://localhost:${port}`);
// });
