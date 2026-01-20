const express = require("express");
const router = express.Router();
const db = require("../db");

/* ==============================
   HELPER: GET USER ID (SAFE)
================================ */
function getUserId(req) {
  return (
    req.headers["x-user-id"] ||
    req.body?.userId ||
    req.query?.userId ||
    null
  );
}

/* ==============================
   PLACE ORDER
   POST /api/orders
================================ */
router.post("/", async (req, res) => {
  const conn = await db.getConnection();
  try {
    const userId = getUserId(req);
    const { items, total } = req.body;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error: "Order items required" });

    const orderTotal = Number(total);
    if (isNaN(orderTotal) || orderTotal <= 0)
      return res.status(400).json({ error: "Invalid total amount" });

    await conn.beginTransaction();

    const [orderResult] = await conn.query(
      `INSERT INTO orders (user_id, total_amount, status)
       VALUES (?, ?, 'pending')`,
      [userId, orderTotal]
    );

    const orderId = orderResult.insertId;
    let inserted = 0;

    for (const i of items) {
      const productId = i.product_id || i.id;
      const price = Number(i.price);
      const quantity = Number(i.quantity || i.qty || 1);

      if (!productId || price <= 0 || quantity <= 0) continue;

      await conn.query(
        `INSERT INTO order_items (order_id, product_id, price, quantity)
         VALUES (?, ?, ?, ?)`,
        [orderId, productId, price, quantity]
      );

      inserted++;
    }

    if (inserted === 0) {
      await conn.rollback();
      return res.status(400).json({ error: "No valid items" });
    }

    await conn.commit();
    res.json({ success: true, orderId });

  } catch (err) {
    await conn.rollback();
    console.error("PLACE ORDER ERROR:", err);
    res.status(500).json({ error: "Failed to place order" });
  } finally {
    conn.release();
  }
});

/* ==============================
   GET USER ORDERS
================================ */
router.get("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.json([]);

    const [orders] = await db.query(
      `SELECT * FROM orders WHERE user_id=? ORDER BY id DESC`,
      [userId]
    );

    for (const o of orders) {
      const [items] = await db.query(
        `SELECT oi.*, p.name
         FROM order_items oi
         LEFT JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id=?`,
        [o.id]
      );
      o.items = items;
    }

    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load orders" });
  }
});

/* ==============================
   GET SINGLE ORDER ✅
================================ */
router.get("/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const orderId = req.params.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const [[order]] = await db.query(
      `SELECT * FROM orders WHERE id=? AND user_id=?`,
      [orderId, userId]
    );

    if (!order) return res.status(404).json({ error: "Order not found" });

    const [items] = await db.query(
      `SELECT oi.*, p.name
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id=?`,
      [orderId]
    );

    order.items = items;
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load order" });
  }
});

module.exports = router;
