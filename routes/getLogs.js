const express = require("express");
const router = express.Router();
const getAllLogs = require("../controllers/getLogs/getLogs.js");
const authenticateToken = require("../middleware/auth");
const checkToken = require("../middleware/checkTokenMiddleware.js");
const createLogMiddleware = require("../middleware/createLogMiddleware.js");

router.post("/getLogs", authenticateToken, getAllLogs);

module.exports = router;
