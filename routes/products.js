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
    cb(null, Date.now() + "-" + Math.round(Math.random()*1e9) + path.extname(file.originalname));
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

/* ================= ADD PRODUCT (3 IMAGES) ================= */
router.post(
  "/",
  upload.fields([
    { name: "image",  maxCount: 1 },
    { name: "image2", maxCount: 1 },
    { name: "image3", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { name, price, description } = req.body;

      if (!name || !price) {
        return res.status(400).json({
          error: "Name and price required"
        });
      }

      const files = req.files || {};

      const image  = files.image  ? "/uploads/" + files.image[0].filename  : "";
      const image2 = files.image2 ? "/uploads/" + files.image2[0].filename : "";
      const image3 = files.image3 ? "/uploads/" + files.image3[0].filename : "";

      await db.query(
        `INSERT INTO products 
         (name, price, description, image, image2, image3)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          name.trim(),
          Number(price),
          description || "",
          image,
          image2,
          image3
        ]
      );

      res.json({ success: true });

    } catch (err) {
      console.error("ADD PRODUCT ERROR:", err);
      res.status(500).json({ error: "Failed to add product" });
    }
  }
);

/* ================= DELETE PRODUCT ================= */
router.delete("/:id", async (req, res) => {
  try {
    const [[product]] = await db.query(
      "SELECT image, image2, image3 FROM products WHERE id = ?",
      [req.params.id]
    );

    await db.query(
      "DELETE FROM products WHERE id = ?",
      [req.params.id]
    );

    /* delete all images */
    [product?.image, product?.image2, product?.image3].forEach(img => {
      if (img) {
        const imgPath = path.join(__dirname, "..", img);
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
      }
    });

    res.json({ success: true });

  } catch (err) {
    console.error("DELETE PRODUCT ERROR:", err);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

module.exports = router;
