const logHandlers = require("./logHandlers");
const buttonHandlers = require("./buttonHandlers");
const commandHandlers = require("./commandHandlers");

// Главная функция для регистрации всех обработчиков
function registerAllHandlers(bot, userSessions, logSubscribers, sendLog) {
  // Регистрируем обработчики команд
  commandHandlers.registerCommandHandlers(
    bot,
    userSessions,
    logSubscribers,
    sendLog
  );

  // Регистрируем обработчики кнопок (теперь передаем logSubscribers)
  buttonHandlers.registerButtonHandlers(
    bot,
    userSessions,
    logSubscribers,
    sendLog
  );

  // Регистрируем обработчики логов
  logHandlers.registerLogHandlers(bot, logSubscribers, sendLog);

  console.log("✅ Все обработчики бота зарегистрированы");
}

module.exports = {
  registerAllHandlers,
  logHandlers,
  buttonHandlers,
  commandHandlers,
};
