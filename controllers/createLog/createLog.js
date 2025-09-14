const Logs = require("../../models/Logs");
const { decodeJwtAndGetUserId } = require("../../utils/jwtDecoder");
const { sendServerLog } = require("../../bots/bot"); // Импортируем функцию отправки в группу

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

    const createLog = await Logs.create(logData);
    console.log(createLog);

    // Отправляем лог в группу
    sendServerLog({
      id: createLog.id, // ID из созданного лога
      email: checkToken.email,
      method: method,
      from: checkToken.brand_slug,
      status: status,
      payload:
        typeof payload === "string"
          ? payload
          : JSON.stringify(payload, null, 2),
      error: error || "",
      level: status === "error" ? "ERROR" : "INFO", // Автоматически определяем уровень
    });

    return res.status(200).json({
      success: true,
      data: createLog,
      message: "Лог успешно создан и отправлен в группу",
    });
  } catch (error) {
    console.error("Ошибка создания лога:", error);

    // Отправляем лог об ошибке в группу
    sendServerLog({
      id: "N/A",
      email: "system",
      method: req.method,
      from: "api",
      status: "error",
      payload: JSON.stringify(
        {
          url: req.url,
          body: req.body,
        },
        null,
        2
      ),
      error: error.message,
      level: "ERROR",
    });

    res.status(500).json({
      success: false,
      message: "Ошибка при создании лога",
      error: error.message,
    });
  }
};
