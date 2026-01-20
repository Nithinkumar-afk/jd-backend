require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname,"uploads")));

/* ROUTES */
app.use("/api/products", require("./routes/products"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/profile", require("./routes/profile"));
app.use("/api/users", require("./routes/users"));

app.listen(PORT, () => {
  console.log("✅ Backend running on http://localhost:" + PORT);
});
