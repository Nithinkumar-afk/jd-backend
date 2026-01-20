const express = require("express");
const router = express.Router();
const db = require("../db");

/* ================= INIT USER ================= */
router.post("/init", async (req, res) => {
  const [r] = await db.query("INSERT INTO users () VALUES ()");
  res.json({ userId: r.insertId });
});

/* ================= GET PROFILE ================= */
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  const [[user]] = await db.query(
    "SELECT * FROM users WHERE id = ?",
    [id]
  );

  res.json(user || {});
});

/* ================= UPDATE PROFILE ================= */
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, phone, altPhone, address } = req.body;

  await db.query(
    "UPDATE users SET name=?, phone=?, alt_phone=?, address=? WHERE id=?",
    [name, phone, altPhone, address, id]
  );

  res.json({ success: true });
});

module.exports = router;
