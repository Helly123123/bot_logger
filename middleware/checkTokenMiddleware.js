const { decodeJwtAndGetUserId } = require("../utils/jwtDecoder");

module.exports = async (req, res, next) => {
  try {
    const { method, payload, from, status, error } = req.body;
    const authHeader = req.headers.authorization;
    const token = authHeader.split(" ")[1];

    const checkToken = await decodeJwtAndGetUserId(token);

    if (checkToken.success) {
      next();
    } else {
      return res.status(401).json({
        success: false,
        message: "token is error",
      });
    }
  } catch (error) {
    console.error("Ошибка регистрации:", error);
    res.status(401).json({
      message: "Ошибка при регистрации пользователя",
    });
  }
};
