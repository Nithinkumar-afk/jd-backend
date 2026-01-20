const express = require("express");
const router = express.Router();
const db = require("../db");

/* ================================
   INIT USER
================================ */
router.post("/init", async (req, res) => {
  try {
    const [result] = await db.query("INSERT INTO users () VALUES ()");
    res.json({ userId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to init user" });
  }
});

/* ================================
   GET PROFILE (FIXED)
================================ */
router.get("/", async (req, res) => {
  try {
    const id = req.headers["x-user-id"];

    if (!id) {
      return res.status(400).json({});
    }

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

/* ================================
   UPDATE PROFILE
================================ */
router.post("/", async (req, res) => {
  try {
    const id = req.headers["x-user-id"];
    const { name, phone, altPhone, address } = req.body;

    if (!id) {
      return res.status(400).json({ success: false });
    }

    await db.query(
      "UPDATE users SET name=?, phone=?, alt_phone=?, address=? WHERE id=?",
      [name, phone, altPhone, address, id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
