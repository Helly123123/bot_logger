const jwt = require("jsonwebtoken");
require("dotenv").config();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Токен доступа отсутствует",
    });
  }

  try {
    // Проверяем токен
    const decoded = jwt.verify(token, process.env.LOGIN_TOKEN);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Ошибка проверки токена:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Токен истек",
        errorType: "token_expired",
      });
    }

    return res.status(403).json({
      success: false,
      message: "Неверный токен",
      errorType: "invalid_token",
    });
  }
};

module.exports = authenticateToken;
