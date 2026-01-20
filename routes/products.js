const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

/* ================= ADMIN KEY ================= */
// HARD FALLBACK (IMPORTANT)
const ADMIN_KEY = process.env.ADMIN_KEY || "JD_ADMIN_SECRET_2026";

/* ================= UPLOAD CONFIG ================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

/* ================= AUTH MIDDLEWARE ================= */
function adminAuth(req, res, next) {
  if (req.headers["x-api-key"] !== ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

/* ================= GET PRODUCTS ================= */
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM products ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

/* ================= ADD PRODUCT ================= */
router.post("/", adminAuth, upload.single("image"), async (req, res) => {
  try {
    const { name, price, description } = req.body;
    if (!name || !price) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const image = req.file ? `/uploads/${req.file.filename}` : "";

    await db.query(
      "INSERT INTO products (name,price,description,image) VALUES (?,?,?,?)",
      [name, price, description || "", image]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Insert failed" });
  }
});

/* ================= DELETE PRODUCT ================= */
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    await db.query("DELETE FROM products WHERE id=?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
});

module.exports = router;
