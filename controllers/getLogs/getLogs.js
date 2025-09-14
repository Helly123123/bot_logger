const Logs = require("../../models/Logs");

module.exports = async (req, res) => {
  try {
    const getLog = await Logs.getAllLogs();

    return res.status(200).json({
      succsecc: true,
      data: getLog,
    });
  } catch (error) {
    console.error("Ошибка регистрации:", error);
    res.status(401).json({
      message: "Ошибка при регистрации пользователя",
    });
  }
};
