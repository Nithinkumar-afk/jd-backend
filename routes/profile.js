const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

/* ================= UPLOAD CONFIG ================= */
const UPLOAD_DIR = path.join(__dirname, "../uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `user-${req.headers["x-user-id"]}${ext}`);
  }
});

const upload = multer({ storage });

/* ================= INIT USER ================= */
router.post("/init", async (req, res) => {
  const [result] = await db.query("INSERT INTO users () VALUES ()");
  res.json({ userId: result.insertId });
});

/* ================= GET PROFILE ================= */
router.get("/", async (req, res) => {
  const id = req.headers["x-user-id"];
  if (!id) return res.status(400).json({});

  const [[user]] = await db.query(
    "SELECT * FROM users WHERE id = ?",
    [id]
  );

  res.json(user || {});
});

/* ================= UPDATE PROFILE ================= */
router.post("/", async (req, res) => {
  const id = req.headers["x-user-id"];
  const { name, phone, altPhone, address } = req.body;

  await db.query(
    "UPDATE users SET name=?, phone=?, alt_phone=?, address=? WHERE id=?",
    [name, phone, altPhone, address, id]
  );

  res.json({ success: true });
});

/* ================= UPLOAD IMAGE ================= */
router.post("/image", upload.single("image"), async (req, res) => {
  const id = req.headers["x-user-id"];
  if (!req.file) return res.status(400).json({});

  const imagePath = `/uploads/${req.file.filename}`;

  await db.query(
    "UPDATE users SET image=? WHERE id=?",
    [imagePath, id]
  );

  res.json({ image: imagePath });
});

module.exports = router;
