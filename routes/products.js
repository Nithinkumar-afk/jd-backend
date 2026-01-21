const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

/* ================= UPLOAD DIR ================= */
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

/* ================= IMAGE UPLOAD ================= */
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

/* ================= GET PRODUCTS ================= */
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM products ORDER BY id DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("GET PRODUCTS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

/* ================= ADD PRODUCT ================= */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { name, price, description } = req.body;

    if (!name || !price) {
      return res.status(400).json({
        error: "Name and price required"
      });
    }

    const image = req.file
      ? "/uploads/" + req.file.filename
      : "";

    await db.query(
      "INSERT INTO products (name, price, description, image) VALUES (?, ?, ?, ?)",
      [
        name.trim(),
        Number(price),
        description || "",
        image
      ]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("ADD PRODUCT ERROR:", err);
    res.status(500).json({ error: "Failed to add product" });
  }
});

/* ================= DELETE PRODUCT ================= */
router.delete("/:id", async (req, res) => {
  try {
    /* get image first */
    const [[product]] = await db.query(
      "SELECT image FROM products WHERE id = ?",
      [req.params.id]
    );

    /* delete db row */
    await db.query(
      "DELETE FROM products WHERE id = ?",
      [req.params.id]
    );

    /* delete image file */
    if (product?.image) {
      const imgPath = path.join(
        __dirname,
        "..",
        product.image
      );
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    res.json({ success: true });

  } catch (err) {
    console.error("DELETE PRODUCT ERROR:", err);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

module.exports = router;

