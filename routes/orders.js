const express = require("express");
const router = express.Router();
const db = require("../db");

/* ==============================
   HELPER: GET USER ID
================================ */
function getUserId(req) {
  return req.headers["x-user-id"] || null;
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

    if (!userId) {
      return res.status(401).json({ error: "User not logged in" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Order items required" });
    }

    if (typeof total !== "number" || total <= 0) {
      return res.status(400).json({ error: "Invalid total amount" });
    }

    await conn.beginTransaction();

    /* INSERT ORDER */
    const [orderResult] = await conn.query(
      `INSERT INTO orders (user_id, total_amount, status)
       VALUES (?, ?, 'pending')`,
      [userId, total]
    );

    const orderId = orderResult.insertId;
    let inserted = 0;

    /* INSERT ITEMS */
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
      return res.status(400).json({ error: "No valid order items" });
    }

    await conn.commit();

    res.json({
      success: true,
      orderId
    });

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
   GET /api/orders
================================ */
router.get("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.json([]);

    const [orders] = await db.query(
      `SELECT * FROM orders
       WHERE user_id=?
       ORDER BY id DESC`,
      [userId]
    );

    for (const order of orders) {
      const [items] = await db.query(
        `SELECT oi.*, p.name
         FROM order_items oi
         LEFT JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id=?`,
        [order.id]
      );
      order.items = items;
    }

    res.json(orders);

  } catch (err) {
    console.error("GET USER ORDERS ERROR:", err);
    res.status(500).json({ error: "Failed to load orders" });
  }
});

/* ==============================
   GET SINGLE ORDER (🔥 REQUIRED)
   GET /api/orders/:id
================================ */
router.get("/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const orderId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const [[order]] = await db.query(
      `SELECT * FROM orders
       WHERE id=? AND user_id=?`,
      [orderId, userId]
    );

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

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
    console.error("GET SINGLE ORDER ERROR:", err);
    res.status(500).json({ error: "Failed to load order" });
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

    res.json(stats);

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
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      "DELETE FROM order_items WHERE order_id=?",
      [req.params.id]
    );

    await conn.query(
      "DELETE FROM orders WHERE id=?",
      [req.params.id]
    );

    await conn.commit();
    res.json({ success: true });

  } catch (err) {
    await conn.rollback();
    console.error("DELETE ORDER ERROR:", err);
    res.status(500).json({ error: "Failed to delete order" });
  } finally {
    conn.release();
  }
});

module.exports = router;
