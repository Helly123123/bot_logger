const Logs = require("../../models/Logs");
const { decodeJwtAndGetUserId } = require("../../utils/jwtDecoder");
const { sendServerLog } = require("../../bots/bot");

module.exports = async (req, res) => {
  try {
    const { level, payload, error, message, method, domain, endpoint, status } =
      req.body;

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization header missing",
      });
    }

    const token = authHeader.split(" ")[1];
    const checkToken = await decodeJwtAndGetUserId(token);

    if (!checkToken.success) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    const logData = {
      level: level || (status === "error" ? "ERROR" : "INFO"),
      payload: typeof payload === "string" ? payload : JSON.stringify(payload),
      error: error || "",
      message: message || "",
      method: method || req.method,
      endpoint: endpoint || req.url,
      status: status || 200,
      server: checkToken.brand_slug,
      domain: domain,
      email: checkToken.email,
    };

    const createLog = await Logs.create(logData);
    console.log(createLog);

    // Раскомментируйте если нужно отправлять в бота
    /*
    sendServerLog({
      id: createLog.id,
      email: checkToken.email,
      method: method,
      from: checkToken.brand_slug,
      status: status,
      payload: typeof payload === "string" ? payload : JSON.stringify(payload, null, 2),
      error: error || "",
      level: level || (status === "error" ? "ERROR" : "INFO"),
      timestamp: createLog.timestamp
    });
    */

    return res.status(200).json({
      success: true,
      data: createLog,
      message: "Лог успешно создан",
    });
  } catch (error) {
    console.error("Ошибка создания лога:", error);

    // Отправляем лог об ошибке
    /*
    sendServerLog({
      id: "N/A",
      email: "system",
      method: req.method,
      from: "api",
      status: "error",
      payload: JSON.stringify({
        url: req.url,
        body: req.body,
      }, null, 2),
      error: error.message,
      level: "ERROR",
      timestamp: Math.floor(Date.now() / 1000)
    });
    */

    res.status(500).json({
      success: false,
      message: "Ошибка при создании лога",
      error: error.message,
    });
  }
};
