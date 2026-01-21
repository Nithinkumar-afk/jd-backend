const express = require("express");
const router = express.Router();
const db = require("../db");

/* ==============================
   HELPER: GET USER ID
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
================================ */
router.post("/", async (req, res) => {
  let conn;

  try {
    conn = await db.getConnection();

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
      `INSERT INTO orders (user_id, total, status)
       VALUES (?, ?, ?)`,
      [userId, orderTotal, "PLACED"]
    );

    const orderId = orderResult.insertId;
    let inserted = 0;

    for (const item of items) {
      const name = item.name;
      const price = Number(item.price);
      const qty = Number(item.qty || item.quantity || 1);

      if (!name || price <= 0 || qty <= 0) continue;

      await conn.query(
        `INSERT INTO order_items (order_id, name, price, quantity)
         VALUES (?, ?, ?, ?)`,
        [orderId, name, price, qty]
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
    if (conn) await conn.rollback();
    console.error("PLACE ORDER ERROR:", err);
    res.status(500).json({ error: "Failed to place order" });
  } finally {
    if (conn) conn.release();
  }
});

/* ==============================
   USER – GET ORDERS
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
        `SELECT name, price, quantity AS qty
         FROM order_items WHERE order_id=?`,
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
   ADMIN – GET ALL ORDERS
================================ */
router.get("/admin", async (_req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT * FROM orders ORDER BY id DESC`
    );

    for (const o of orders) {
      const [items] = await db.query(
        `SELECT name, price, quantity AS qty
         FROM order_items WHERE order_id=?`,
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
   ADMIN – UPDATE STATUS
================================ */
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;

    const VALID = ["PLACED", "SHIPPED", "DELIVERED", "CANCELLED"];
    if (!VALID.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const [result] = await db.query(
      `UPDATE orders SET status=? WHERE id=?`,
      [status, orderId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("UPDATE STATUS ERROR:", err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

/* ==============================
   ADMIN – DELETE ORDER
================================ */
router.delete("/:id", async (req, res) => {
  try {
    const orderId = req.params.id;

    await db.query(
      `DELETE FROM order_items WHERE order_id=?`,
      [orderId]
    );

    const [result] = await db.query(
      `DELETE FROM orders WHERE id=?`,
      [orderId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE ORDER ERROR:", err);
    res.status(500).json({ error: "Failed to delete order" });
  }
});

module.exports = router;
