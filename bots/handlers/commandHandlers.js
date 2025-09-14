const { createMainMenu } = require("./buttonHandlers");

function registerCommandHandlers(bot, userSessions, logSubscribers, sendLog) {
  // Команда /start
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const username = msg.chat.first_name || "пользователь";

    bot.sendMessage(
      chatId,
      `Привет, ${username}! 👋\n\nЯ бот-логгер с кнопками!`
    );
    createMainMenu(bot, chatId);
  });

  // Команда /help
  bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(
      chatId,
      `
📋 **Команды:**
/start - Начать
/help - Помощь  
/menu - Меню с кнопками
/subscribe - Подписаться на логи
/unsubscribe - Отписаться
/test - Тест лога
/stats - Статистика
        `.trim()
    );
  });

  // Команда /menu
  bot.onText(/\/menu/, (msg) => {
    const chatId = msg.chat.id;
    createMainMenu(bot, chatId);
  });

  // Команда /subscribe
  bot.onText(/\/subscribe/, (msg) => {
    const chatId = msg.chat.id;

    if (logSubscribers.has(chatId)) {
      bot.sendMessage(chatId, "✅ Уже подписаны!");
    } else {
      logSubscribers.add(chatId);
      bot.sendMessage(chatId, "✅ Подписались на логи!");
    }
  });

  // Команда /unsubscribe
  bot.onText(/\/unsubscribe/, (msg) => {
    const chatId = msg.chat.id;

    if (logSubscribers.has(chatId)) {
      logSubscribers.delete(chatId);
      bot.sendMessage(chatId, "✅ Отписались от логов.");
    } else {
      bot.sendMessage(chatId, "❌ Не были подписаны.");
    }
  });

  // Команда /test
  bot.onText(/\/test/, (msg) => {
    const chatId = msg.chat.id;

    sendLog({
      level: "TEST",
      message: "Тест из команды",
      source: "Test Command",
    });

    bot.sendMessage(chatId, "📨 Тест отправлен!");
  });

  // Команда /stats
  bot.onText(/\/stats/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `📊 Подписчиков: ${logSubscribers.size}`);
  });

  // Обычные сообщения
  bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text.startsWith("/")) {
      bot.sendMessage(chatId, `💬 "${text}"\nИспользуй /help`);
    }
  });

  console.log("✅ Команды зарегистрированы");
}

module.exports = {
  registerCommandHandlers,
};
