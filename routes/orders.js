const express = require("express");
const router = express.Router();
const db = require("../db");

/* ==============================
   HELPER: GET USER ID (SAFE + DEBUG)
================================ */
function getUserId(req) {
  const uid =
    req.headers["x-user-id"] ||
    req.body?.userId ||
    req.query?.userId ||
    null;

  if (!uid) {
    console.error("❌ USER ID MISSING", {
      headers: req.headers,
      body: req.body
    });
  }

  return uid;
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
      return res.status(400).json({ error: "User ID required" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Order items required" });
    }

    const orderTotal = Number(total);
    if (isNaN(orderTotal) || orderTotal <= 0) {
      return res.status(400).json({ error: "Invalid total amount" });
    }

    await conn.beginTransaction();

    const [orderResult] = await conn.query(
      `INSERT INTO orders (user_id, total_amount, status)
       VALUES (?, ?, 'PLACED')`,
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
      return res.status(400).json({ error: "No valid order items" });
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
    console.error("GET USER ORDERS ERROR:", err);
    res.status(500).json({ error: "Failed to load orders" });
  }
});

/* ==============================
   ADMIN (OPEN) – GET ALL ORDERS
   GET /api/orders/admin
================================ */
router.get("/admin", async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT * FROM orders ORDER BY id DESC`
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
    console.error("ADMIN ORDERS ERROR:", err);
    res.status(500).json({ error: "Failed to load admin orders" });
  }
});

/* ==============================
   GET SINGLE ORDER (USER)
   GET /api/orders/:id
================================ */
router.get("/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const orderId = req.params.id;

    if (!userId) {
      return res.status(400).json({ error: "User ID required" });
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
    console.error("GET ORDER ERROR:", err);
    res.status(500).json({ error: "Failed to load order" });
  }
});

/* ==============================
   ADMIN (OPEN) – UPDATE STATUS
   PUT /api/orders/:id/status
================================ */
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ["PLACED", "SHIPPED", "DELIVERED", "CANCELLED"];

    if (!valid.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    await db.query(
      `UPDATE orders SET status=? WHERE id=?`,
      [status, req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("UPDATE STATUS ERROR:", err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

/* ==============================
   ADMIN (OPEN) – DELETE ORDER
   DELETE /api/orders/:id
================================ */
router.delete("/:id", async (req, res) => {
  try {
    await db.query(
      `DELETE FROM order_items WHERE order_id=?`,
      [req.params.id]
    );
    await db.query(
      `DELETE FROM orders WHERE id=?`,
      [req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE ORDER ERROR:", err);
    res.status(500).json({ error: "Failed to delete order" });
  }
});

module.exports = router;
