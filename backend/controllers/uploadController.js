async function handleFileUpload(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  // Media is served through the protected /api/media/:filename route
  // which verifies authentication and ownership before serving the file.
  res.json({
    url: `/api/media/${req.file.filename}`,
    name: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
}

module.exports = {
  handleFileUpload,
};
