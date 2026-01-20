const express = require("express");
const router = express.Router();
const db = require("../db");

/* ==============================
   HELPER: GET USER ID SAFELY
================================ */
function getUserId(req) {
  return (
    req.headers["x-user-id"] ||
    req.body.userId ||
    req.query.userId ||
    null
  );
}

/* ==============================
   PLACE ORDER
   POST /api/orders
================================ */
router.post("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { items, total } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "User not logged in" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Order items required" });
    }

    if (!total || isNaN(total)) {
      return res.status(400).json({ error: "Invalid total amount" });
    }

    /* INSERT ORDER */
    const [orderResult] = await db.query(
      "INSERT INTO orders (user_id, total_amount, status) VALUES (?, ?, 'pending')",
      [userId, Number(total)]
    );

    const orderId = orderResult.insertId;

    /* INSERT ORDER ITEMS */
    for (const i of items) {
      if (!i.name || !i.price || !i.quantity) continue;

      await db.query(
        "INSERT INTO order_items (order_id, name, price, quantity) VALUES (?, ?, ?, ?)",
        [
          orderId,
          i.name,
          Number(i.price),
          Number(i.quantity)
        ]
      );
    }

    res.json({ success: true, orderId });

  } catch (err) {
    console.error("PLACE ORDER ERROR:", err);
    res.status(500).json({ error: "Failed to place order" });
  }
});

/* ==============================
   GET USER ORDERS
   GET /api/orders
================================ */
router.get("/", async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) return res.json([]);

    const [orders] = await db.query(
      "SELECT * FROM orders WHERE user_id=? ORDER BY id DESC",
      [userId]
    );

    for (const o of orders) {
      const [items] = await db.query(
        "SELECT * FROM order_items WHERE order_id=?",
        [o.id]
      );
      o.items = items;
    }

    res.json(orders);

  } catch (err) {
    console.error("GET USER ORDERS ERROR:", err);
    res.status(500).json({ error: "Failed to load orders" });
  }
});

/* ==============================
   ADMIN – DASHBOARD STATS
   GET /api/orders/admin
================================ */
router.get("/admin", async (req, res) => {
  try {
    const [[stats]] = await db.query(`
      SELECT
        COUNT(*) AS totalOrders,
        COALESCE(SUM(total_amount), 0) AS totalRevenue
      FROM orders
    `);

    res.json({
      totalOrders: stats.totalOrders,
      totalRevenue: stats.totalRevenue
    });

  } catch (err) {
    console.error("ADMIN STATS ERROR:", err);
    res.status(500).json({ error: "Failed to load stats" });
  }
});

/* ==============================
   UPDATE ORDER STATUS
   PUT /api/orders/:id/status
================================ */
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status required" });
    }

    await db.query(
      "UPDATE orders SET status=? WHERE id=?",
      [status, req.params.id]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("UPDATE STATUS ERROR:", err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

/* ==============================
   DELETE ORDER
   DELETE /api/orders/:id
================================ */
router.delete("/:id", async (req, res) => {
  try {
    await db.query(
      "DELETE FROM order_items WHERE order_id=?",
      [req.params.id]
    );

    await db.query(
      "DELETE FROM orders WHERE id=?",
      [req.params.id]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("DELETE ORDER ERROR:", err);
    res.status(500).json({ error: "Failed to delete order" });
  }
});

module.exports = router;
