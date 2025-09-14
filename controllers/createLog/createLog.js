const Logs = require("../../models/Logs");
const { decodeJwtAndGetUserId } = require("../../utils/jwtDecoder");

module.exports = async (req, res) => {
  try {
    const { method, payload, status, error } = req.body;

    const authHeader = req.headers.authorization;
    const token = authHeader.split(" ")[1];

    const checkToken = await decodeJwtAndGetUserId(token);

    if (!checkToken.success) {
      return res.status(404).json({
        success: false,
        message: "token error",
      });
    }

    const logData = {
      ...req.body,
      from: checkToken.brand_slug,
      email: checkToken.email,
    };

    const createLog = Logs.create(logData);
    console.log(createLog);

    return res.status(200).json({
      succsecc: true,
      data: res.body,
    });
  } catch (error) {
    console.error("Ошибка регистрации:", error);
    res.status(401).json({
      message: "Ошибка при регистрации пользователя",
    });
  }
};
