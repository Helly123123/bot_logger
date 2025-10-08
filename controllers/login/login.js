const jwt = require("jsonwebtoken");
require("dotenv").config();

module.exports = async (req, res) => {
  const { login, password } = req.body;

  if (!login && !password) {
    return res.status(400).json({
      success: false,
      message: "Параметры 'password' и 'login' обязателены",
    });
  }

  const adminUser = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  try {
    if (login != adminUser) {
      return res.status(401).json({
        success: false,
        errorType: "login",
        message: "Неверный логин",
      });
    }

    if (password != adminPassword) {
      return res.status(401).json({
        success: false,
        errorType: "password",
        message: "Неверный пароль",
      });
    }

    const token = jwt.sign({ user: adminUser }, process.env.LOGIN_TOKEN, {
      expiresIn: "24h",
    });

    return res.status(200).json({
      success: true,
      token: token,
      message: "Login successful",
    });
  } catch (error) {
    console.error("Ошибка получения логов:", error.message);

    res.status(500).json({
      success: false,
      message: "Ошибка при получении логов",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
