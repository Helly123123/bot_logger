const express = require("express");
const router = express.Router();
const getAllLogs = require("../controllers/getLogs/getLogs.js");

const checkToken = require("../middleware/checkTokenMiddleware.js");
const createLogMiddleware = require("../middleware/createLogMiddleware.js");

router.post("/getLogs", getAllLogs);

module.exports = router;
