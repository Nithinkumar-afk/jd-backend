const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const path = require("path");

const ADMIN_KEY = process.env.ADMIN_KEY;


/* IMAGE UPLOAD */
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (_, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

/* GET PRODUCTS */
router.get("/", async (req,res)=>{
  const [rows] = await db.query("SELECT * FROM products");
  res.json(rows);
});

/* ADD PRODUCT */
router.post("/", upload.single("image"), async (req,res)=>{
  if(req.headers["x-api-key"] !== ADMIN_KEY)
    return res.status(401).json({error:"Unauthorized"});

  const { name, price, description } = req.body;
  const image = req.file ? "/uploads/" + req.file.filename : "";

  await db.query(
    "INSERT INTO products (name,price,description,image) VALUES (?,?,?,?)",
    [name, price, description, image]
  );

  res.json({ success:true });
});

/* DELETE PRODUCT */
router.delete("/:id", async (req,res)=>{
  if(req.headers["x-api-key"] !== ADMIN_KEY)
    return res.status(401).json({error:"Unauthorized"});

  await db.query("DELETE FROM products WHERE id=?", [req.params.id]);
  res.json({ success:true });
});

module.exports = router;
