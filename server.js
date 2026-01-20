require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 8080;

/* ================= ENSURE UPLOAD DIR ================= */
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
  console.log("📁 uploads folder created");
}

/* ================= MIDDLEWARE ================= */
app.use(cors({
  origin: "*",
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","x-api-key"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ================= STATIC ================= */
app.use("/uploads", express.static(uploadDir));

/* ================= ROOT ================= */
app.get("/", (req, res) => {
  res.json({
    status: "Backend running 🚀",
    serverTime: new Date().toISOString()
  });
});

/* ================= ROUTES ================= */
app.use("/api/products", require("./routes/products"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/profile", require("./routes/profile"));
app.use("/api/users", require("./routes/users"));

/* ================= ERROR HANDLER ================= */
app.use((err, req, res, next) => {
  console.error("🔥 ERROR:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error"
  });
});

/* ================= START ================= */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});
