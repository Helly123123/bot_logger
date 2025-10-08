const express = require("express");
const router = express.Router();
// const createLog = require("../controllers/createLog/createLog");

const login = require("../controllers/login/login.js");

// const checkToken = require("../middleware/checkTokenMiddleware.js");
// const createLogMiddleware = require("../middleware/createLogMiddleware.js");

router.post("/login", login);

module.exports = router;
