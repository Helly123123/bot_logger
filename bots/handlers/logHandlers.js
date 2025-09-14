function registerLogHandlers(bot, logSubscribers, sendLog) {
  // Подписка на логи
  bot.onText(/\/subscribe_logs/, (msg) => {
    const chatId = msg.chat.id;

    if (logSubscribers.has(chatId)) {
      bot.sendMessage(chatId, "✅ Вы уже подписаны на получение логов!");
    } else {
      logSubscribers.add(chatId);
      bot.sendMessage(chatId, "✅ Вы успешно подписались на получение логов!");
      sendLog({
        level: "INFO",
        message: "Новый подписчик на логи",
        source: "Telegram Bot",
        additionalData: { chatId },
      });
    }
  });

  // Отписка от логов
  bot.onText(/\/unsubscribe_logs/, (msg) => {
    const chatId = msg.chat.id;

    if (logSubscribers.has(chatId)) {
      logSubscribers.delete(chatId);
      bot.sendMessage(chatId, "✅ Вы отписались от получения логов.");
    } else {
      bot.sendMessage(chatId, "❌ Вы не были подписаны на логи.");
    }
  });

  // Тестовый лог
  bot.onText(/\/test_log/, (msg) => {
    const chatId = msg.chat.id;

    sendLog({
      level: "TEST",
      message: "Тестовое сообщение из бота",
      source: "Test Command",
      additionalData: {
        chatId,
        username: msg.chat.username,
        testData: { value: 42, text: "test" },
      },
    });

    bot.sendMessage(chatId, "📨 Тестовый лог отправлен!");
  });

  // Статистика логов
  bot.onText(/\/log_stats/, (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(
      chatId,
      `
📊 **Статистика логгера:**
👥 Подписчиков: ${logSubscribers.size}
💬 Ваш chatId: ${chatId}
${
  process.env.LOG_CHAT_ID
    ? `📨 Основной чат: ${process.env.LOG_CHAT_ID}`
    : "⚠️ Основной чат не настроен"
}
        `.trim()
    );
  });
}

module.exports = {
  registerLogHandlers,
};
