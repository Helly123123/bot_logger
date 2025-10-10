const Logs = require("../../models/Logs");
const { decodeJwtAndGetUserId } = require("../../utils/jwtDecoder");
const { getTypeLog } = require("../../utils/getTypeLog");
const { sendServerLog, sendErrorToGroup } = require("../../bots/bot");

module.exports = async (req, res) => {
  try {
    const {
      level,
      payload,
      error,
      message,
      serverDomain,
      method,
      domain,
      endpoint,
      status,
    } = req.body;

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

    let processedPayload = "";
    if (payload) {
      if (typeof payload === "string") {
        processedPayload = payload;
      } else if (typeof payload === "object") {
        try {
          processedPayload = JSON.stringify(payload);
        } catch (stringifyError) {
          processedPayload = "Unable to stringify payload object";
          console.warn(
            "⚠️ Не удалось преобразовать payload в JSON:",
            stringifyError
          );
        }
      }
    }

    const logData = {
      level: level || (status === "error" ? "ERROR" : "INFO"),
      payload: processedPayload,
      error: error || "",
      message: message || "",
      method: method || req.method,
      endpoint: endpoint || req.url,
      status: status || 200,
      server: serverDomain,
      type: getTypeLog(serverDomain),
      domain: domain || "",
      email: checkToken.email,
    };

    console.log("log", logData);

    // Сохраняем лог в базу
    const createLog = await Logs.create(logData);
    console.log("✅ Лог создан, ID:", createLog.id);

    // Если статус ошибки - отправляем в Telegram группу
    if (status === "ERROR") {
      console.log("🚨 Обнаружена ошибка, отправляем в группу...");

      sendErrorToGroup({
        ...logData,
        id: createLog.id,
        timestamp: new Date(),
      })
        .then((result) => {
          if (result && result.success) {
            console.log(
              `✅ Ошибка отправлена в Telegram группу. ID сообщения: ${result.messageId}`
            );
          } else {
            console.log(
              `⚠️ Не удалось отправить ошибку в группу: ${
                result?.reason || "unknown error"
              }`
            );
          }
        })
        .catch((err) => {
          console.error("❌ Ошибка при отправке в группу:", err.message);
        });
    }

    return res.status(200).json({
      success: true,
      data: createLog,
      message: "Лог успешно создан",
    });
  } catch (error) {
    console.error("❌ Ошибка создания лога:", error.message);
    console.error("📋 Детали ошибки:", {
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
    });

    // Логируем тело запроса для отладки
    console.log("📦 Тело запроса:", JSON.stringify(req.body, null, 2));

    res.status(500).json({
      success: false,
      message: "Ошибка при создании лога",
      error: error.message,
    });
  }
};
