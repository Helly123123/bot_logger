const express = require("express");
const router = express.Router();
const createLog = require("../controllers/createLog/createLog");

const checkToken = require("../middleware/checkTokenMiddleware.js");
const createLogMiddleware = require("../middleware/createLogMiddleware.js");

router.post("/createLog", createLogMiddleware, checkToken, createLog);

module.exports = router;
