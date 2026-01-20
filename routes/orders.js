const express = require("express");
const router = express.Router();
const db = require("../db");

const ADMIN_KEY = process.env.ADMIN_KEY;

/* ==============================
   PLACE ORDER
================================ */
router.post("/", async (req, res) => {
  const userId = req.headers["x-user-id"];
  const { items, total } = req.body;

  const [r] = await db.query(
    "INSERT INTO orders (user_id, total_amount, status) VALUES (?, ?, 'pending')",
    [userId, total]
  );

  for (const i of items) {
    await db.query(
      "INSERT INTO order_items (order_id, name, price, quantity) VALUES (?,?,?,?)",
      [r.insertId, i.name, i.price, i.quantity]
    );
  }

  res.json({ success: true });
});

/* ==============================
   GET USER ORDERS
================================ */
router.get("/", async (req, res) => {
  const userId = req.headers["x-user-id"];

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
});

/* ==============================
   ADMIN – UPDATE ORDER STATUS
   PUT /api/orders/:id/status
================================ */
router.put("/:id/status", async (req, res) => {
  if (req.headers["x-api-key"] !== ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { status } = req.body;

  await db.query(
    "UPDATE orders SET status=? WHERE id=?",
    [status, req.params.id]
  );

  res.json({ success: true });
});

/* ==============================
   ADMIN – DELETE ORDER
   DELETE /api/orders/:id
================================ */
router.delete("/:id", async (req, res) => {
  if (req.headers["x-api-key"] !== ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  await db.query(
    "DELETE FROM order_items WHERE order_id=?",
    [req.params.id]
  );
  await db.query(
    "DELETE FROM orders WHERE id=?",
    [req.params.id]
  );

  res.json({ success: true });
});

module.exports = router;
