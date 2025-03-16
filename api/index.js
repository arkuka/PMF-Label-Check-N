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
    count++
    return res.status(200).json({ count })
  }

  return res.status(405).json({ error: "Method not allowed" })
}

