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

/* ================= USER ID ================= */
function getUserId(req) {
  return req.headers["x-user-id"];
}

/* ================= GET PROFILE ================= */
router.get("/", async (req, res) => {
  try {
    const id = getUserId(req);
    if (!id) return res.json({});

    const [[user]] = await db.query(
      "SELECT name, phone, alt_phone, address, image FROM users WHERE id=?",
      [id]
    );

    res.json(user || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= SAVE PROFILE (UPSERT) ================= */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const id = getUserId(req);
    if (!id) return res.status(400).json({ error: "No user id" });

    const { name, phone, alt_phone, address } = req.body;

    let image = null;
    if (req.file) image = "/uploads/" + req.file.filename;

    await db.query(
      `INSERT INTO users (id, name, phone, alt_phone, address, image)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name=VALUES(name),
         phone=VALUES(phone),
         alt_phone=VALUES(alt_phone),
         address=VALUES(address),
         image=IFNULL(VALUES(image), image)`,
      [id, name, phone, alt_phone, address, image]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("PROFILE SAVE ERROR:", err);
    res.status(500).json({ error: "Save failed" });
  }
});

module.exports = router;
