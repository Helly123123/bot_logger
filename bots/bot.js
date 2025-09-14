const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();

// Проверяем наличие токена
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN не найден в .env файле");
  process.exit(1);
}

// Создаем экземпляр бота
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  polling: true,
});

// Глобальные переменные
const userSessions = new Map();
const logSubscribers = new Set();

// Функция для отправки логов
const sendLog = (logData) => {
  const {
    level = "INFO",
    message,
    timestamp = new Date().toISOString(),
    source,
    additionalData = {},
  } = logData;

  const formattedMessage = `
📊 **Лог [${level}]**
⏰ Время: ${timestamp}
📝 Сообщение: ${message}
${source ? `🔗 Источник: ${source}\n` : ""}
${
  Object.keys(additionalData).length > 0
    ? `📋 Данные:\n\`\`\`json\n${JSON.stringify(
        additionalData,
        null,
        2
      )}\n\`\`\``
    : ""
}
    `.trim();

  console.log(`[${level}] ${message}`, additionalData);

  // Отправляем подписчикам
  logSubscribers.forEach((chatId) => {
    bot
      .sendMessage(chatId, formattedMessage, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      })
      .catch(console.error);
  });

  // Основной чат для логов
  if (process.env.LOG_CHAT_ID) {
    bot
      .sendMessage(process.env.LOG_CHAT_ID, formattedMessage, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      })
      .catch(console.error);
  }
};

// Импортируем обработчики
const { registerCommandHandlers } = require("./handlers/commandHandlers");
const { registerButtonHandlers } = require("./handlers/buttonHandlers");

// Регистрируем обработчики
registerCommandHandlers(bot, userSessions, logSubscribers, sendLog);
registerButtonHandlers(bot, userSessions, logSubscribers, sendLog);

console.log("🤖 Бот запущен!");

module.exports = {
  bot,
  userSessions,
  logSubscribers,
  sendLog,
};
