const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const path = require("path");

/* ================= MULTER ================= */
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

/* ================= GET PROFILE ================= */
router.get("/", async (req, res) => {
  try {
    const id = req.headers["x-user-id"];
    if (!id) return res.json({});

    const [[user]] = await db.query(
      "SELECT * FROM users WHERE id = ?",
      [id]
    );

    res.json(user || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({});
  }
});

/* ================= UPDATE PROFILE ================= */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const id = req.headers["x-user-id"];
    if (!id) return res.status(400).json({});

    const { name, phone, altPhone, address } = req.body;

    let imageSql = "";
    let params = [name, phone, altPhone, address];

    if (req.file) {
      imageSql = ", image=?";
      params.push("/uploads/" + req.file.filename);
    }

    params.push(id);

    await db.query(
      `UPDATE users SET name=?, phone=?, alt_phone=?, address=?${imageSql} WHERE id=?`,
      params
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({});
  }
});

module.exports = router;
