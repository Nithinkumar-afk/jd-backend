const express = require("express");
const router = express.Router();
const db = require("../db");

/* ================= GET ALL USERS ================= */
router.get("/users", async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT 
        id,
        name,
        phone,
        alt_phone,
        address,
        image,
        created_at
      FROM users
      ORDER BY created_at DESC
    `);

    res.json(users);
  } catch (err) {
    console.error("ADMIN USERS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ================= ADMIN STATS ================= */
router.get("/stats", async (req, res) => {
  try {
    const [[users]] = await db.query(
      "SELECT COUNT(*) AS totalUsers FROM users"
    );

    const [[orders]] = await db.query(
      "SELECT COUNT(*) AS totalOrders FROM orders"
    );

    res.json({
      users: users.totalUsers,
      orders: orders.totalOrders
    });
  } catch (err) {
    console.error("ADMIN STATS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
