const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

/* ===============================
   ENSURE UPLOADS FOLDER EXISTS
================================ */
const UPLOAD_DIR = path.join(__dirname, "../uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

/* ===============================
   MULTER CONFIG
================================ */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

/* ===============================
   GET USER ID (STRING)
================================ */
function getUserId(req) {
  return req.headers["x-user-id"];
}

/* ===============================
   GET PROFILE
================================ */
router.get("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.json({});

    const [[user]] = await db.query(
      "SELECT name, phone, alt_phone, address, image FROM users WHERE id=?",
      [userId]
    );

    res.json(user || {});
  } catch (err) {
    console.error("GET PROFILE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===============================
   SAVE / UPDATE PROFILE (UPSERT)
================================ */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(400).json({ error: "No user id" });
    }

    const { name, phone, alt_phone, address } = req.body;

    let imagePath = null;
    if (req.file) {
      imagePath = "/uploads/" + req.file.filename;
    }

    const sql = `
      INSERT INTO users (id, name, phone, alt_phone, address, image)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name=VALUES(name),
        phone=VALUES(phone),
        alt_phone=VALUES(alt_phone),
        address=VALUES(address),
        image=IFNULL(VALUES(image), image)
    `;

    await db.query(sql, [
      userId,        // ✅ STRING ID (jd_user_xxx)
      name,
      phone,
      alt_phone,
      address,
      imagePath
    ]);

    res.json({ success: true });

  } catch (err) {
    console.error("PROFILE SAVE ERROR:", err);
    res.status(500).json({ error: "Save failed" });
  }
});

module.exports = router;
