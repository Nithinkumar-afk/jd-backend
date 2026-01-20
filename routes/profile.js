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

/* ================= GET USER ID (FIX) ================= */
function getUserId(req) {
  return req.headers["x-user-id"] || req.query.userId;
}

/* ================= GET PROFILE ================= */
router.get("/", async (req, res) => {
  try {
    const id = getUserId(req);
    if (!id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [[user]] = await db.query(
      "SELECT name, phone, alt_phone, address, image FROM users WHERE id = ?",
      [id]
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("GET PROFILE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ================= UPDATE PROFILE ================= */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const id = getUserId(req);
    if (!id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { name, phone, altPhone, address } = req.body;

    let imageSql = "";
    let params = [name, phone, altPhone, address];

    if (req.file) {
      imageSql = ", image=?";
      params.push("/uploads/" + req.file.filename);
    }

    params.push(id);

    await db.query(
      `UPDATE users 
       SET name=?, phone=?, alt_phone=?, address=?${imageSql}
       WHERE id=?`,
      params
    );

    res.json({ success: true });
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
