require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// 🚨 Railway injects PORT automatically
const PORT = process.env.PORT || 8080;

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================= STATIC FILES =================
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ================= ROOT ROUTE (VERY IMPORTANT) =================
app.get("/", (req, res) => {
  res.json({
    status: "Backend is running 🚀",
    time: new Date()  // ✅ Added server time
  });
});

// ================= ROUTES =================
app.use("/api/products", require("./routes/products"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/profile", require("./routes/profile"));
app.use("/api/users", require("./routes/users"));

// ================= GLOBAL ERROR HANDLER =================
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

// ================= START SERVER =================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
