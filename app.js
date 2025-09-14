const express = require("express");

const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const getAllLogs = require("./routes/getLogs.js");
const createLog = require("./routes/createLog.js");

app.use("/api/", createLog);
app.use("/api/", getAllLogs);

app.get("/", (req, res) => {
  res.json({ message: "API is working" });
});

// Обработка 404
app.use((req, res) => {
  res.status(404).json({ message: "Not Found" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal Server Error" });
});

module.exports = app;
