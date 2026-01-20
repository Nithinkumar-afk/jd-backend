const express = require("express");
const router = express.Router();
const db = require("../db");

const ADMIN_KEY = process.env.ADMIN_KEY;

/* ==============================
   ADMIN – GET ALL USERS
================================ */
router.get("/", async (req, res) => {
  if (req.headers["x-api-key"] !== ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const [users] = await db.query(
      "SELECT id, name, phone, address, created_at FROM users ORDER BY id DESC"
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

/* ==============================
   ADMIN – GET SINGLE USER
================================ */
router.get("/:id", async (req, res) => {
  if (req.headers["x-api-key"] !== ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const [[user]] = await db.query(
      "SELECT * FROM users WHERE id = ?",
      [req.params.id]
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;
