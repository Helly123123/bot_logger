const Logs = require("../../models/Logs");

module.exports = async (req, res) => {
  const { server, domain } = req.body;
  
  // Проверка обязательных параметров
  if (!server) {
    return res.status(400).json({
      success: false,
      message: "Параметр 'server' обязателен",
    });
  }

  try {
    const getLog = await Logs.getAllLogs(server, domain);
    
    return res.status(200).json({
      success: true,
      data: getLog,
    });
  } catch (error) {
    console.error("Ошибка получения логов:", error.message);
    
    // Более информативные ошибки
    if (error.message.includes('Unknown server')) {
      return res.status(400).json({
        success: false,
        message: `Неизвестный сервер: ${server}. Доступные серверы: be_pay, frontend_vue, be_auth`,
      });
    }
    
    if (error.message.includes('Database error')) {
      return res.status(500).json({
        success: false,
        message: "Ошибка базы данных",
      });
    }

    res.status(500).json({
      success: false,
      message: "Ошибка при получении логов",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};