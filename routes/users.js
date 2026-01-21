const express = require("express");
const router = express.Router();
const db = require("../db");

/* ==============================
   ADMIN KEY CHECK MIDDLEWARE
================================ */
function adminAuth(req, res, next) {
  const adminKey = req.headers["x-api-key"];

  if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized admin access" });
  }
  next();
}

/* ==============================
   PUBLIC – GET ALL USERS (FIXED)
   ❌ NO ADMIN AUTH
================================ */
router.get("/", async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT name, phone, address, image FROM users ORDER BY created_at DESC"
    );
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

/* ==============================
   ADMIN – GET SINGLE USER
================================ */
router.get("/:id", adminAuth, async (req, res) => {
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
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

/* ==============================
   ADMIN – UPDATE USER
================================ */
router.put("/:id", adminAuth, async (req, res) => {
  const { name, phone, alt_phone, address } = req.body;

  try {
    await db.query(
      `UPDATE users 
       SET name=?, phone=?, alt_phone=?, address=? 
       WHERE id=?`,
      [name, phone, alt_phone, address, req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

/* ==============================
   ADMIN – DELETE USER
================================ */
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    await db.query("DELETE FROM users WHERE id=?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

module.exports = router;
