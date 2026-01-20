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
// serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ================= API ROUTES =================
app.use("/api/products", require("./routes/products"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/profile", require("./routes/profile"));
app.use("/api/users", require("./routes/users"));

// ================= ROOT HEALTH CHECK =================
app.get("/", (req, res) => {
  res.send("✅ JD Backend API is running");
});

// ================= START SERVER =================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
