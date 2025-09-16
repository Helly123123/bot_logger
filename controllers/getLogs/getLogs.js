const Logs = require("../../models/Logs");
const { get } = require("../../routes/createLog");

module.exports = async (req, res) => {

  const {server} = req.body
  try {
    const getLog = await Logs.getAllLogs(server);

    console.log(getLog)

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
