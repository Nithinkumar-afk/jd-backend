const express = require("express");
const router = express.Router();
const db = require("../db");

/* PLACE ORDER */
router.post("/", async (req,res)=>{
  const userId = req.headers["x-user-id"];
  const { items, total } = req.body;

  const [r] = await db.query(
    "INSERT INTO orders (user_id,total_amount) VALUES (?,?)",
    [userId, total]
  );

  for(const i of items){
    await db.query(
      "INSERT INTO order_items (order_id,name,price,quantity) VALUES (?,?,?,?)",
      [r.insertId, i.name, i.price, i.quantity]
    );
  }

  res.json({ success:true });
});

/* GET USER ORDERS */
router.get("/", async (req,res)=>{
  const userId = req.headers["x-user-id"];

  const [orders] = await db.query(
    "SELECT * FROM orders WHERE user_id=? ORDER BY id DESC",
    [userId]
  );

  for(const o of orders){
    const [items] = await db.query(
      "SELECT * FROM order_items WHERE order_id=?",
      [o.id]
    );
    o.items = items;
  }

  res.json(orders);
});

module.exports = router;
