const Logs = require("../../models/Logs");

function registerButtonHandlers(bot, userSessions, logSubscribers, sendLog) {
  // Храним выбранное количество для каждого пользователя
  const userSelections = new Map();

  bot.on("callback_query", (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    const messageId = callbackQuery.message.message_id;

    console.log("Кнопка нажата:", data);

    // ОБЯЗАТЕЛЬНО отвечаем на callback
    bot.answerCallbackQuery(callbackQuery.id);

    // Обрабатываем действия
    switch (true) {
      // Выбор количества логов
      case data.startsWith("select_count_"):
        const count = data.replace("select_count_", "");
        userSelections.set(chatId, { count });
        selectLogType(bot, chatId, messageId, count);
        break;

      // Выбор типа логов
      case data.startsWith("select_type_"):
        const type = data.replace("select_type_", "");
        const userSelection = userSelections.get(chatId) || {};
        userSelections.set(chatId, { ...userSelection, type });

        const selectedCount = userSelection.count || "all";
        getAllLogs(bot, chatId, messageId, selectedCount, type);
        break;

      // Остальные кнопки
      case data === "get_status":
        handleStatus(bot, chatId, messageId);
        break;

      case data === "get_logs":
        selectLogsCount(bot, chatId, messageId);
        break;

      case data === "test_log":
        handleTestLog(bot, chatId, messageId, sendLog);
        break;

      case data === "subscribe":
        handleSubscribe(bot, chatId, messageId, logSubscribers);
        break;

      case data === "unsubscribe":
        handleUnsubscribe(bot, chatId, messageId, logSubscribers);
        break;

      case data === "main_menu":
        handleMainMenu(bot, chatId, messageId);
        break;

      default:
        console.log("Неизвестная кнопка:", data);
    }
  });

  console.log("✅ Обработчики кнопок зарегистрированы");
}

// Выбор количества логов
function selectLogsCount(bot, chatId, messageId) {
  const text = `📊 Выберите количество логов:`;

  bot.editMessageText(text, {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: {
      inline_keyboard: [
        [{ text: "10 логов", callback_data: "select_count_10" }],
        [{ text: "50 логов", callback_data: "select_count_50" }],
        [{ text: "100 логов", callback_data: "select_count_100" }],
        [{ text: "Все логи", callback_data: "select_count_all" }],
        [{ text: "↩️ Назад", callback_data: "main_menu" }],
      ],
    },
  });
}

// Выбор типа логов
function selectLogType(bot, chatId, messageId, count) {
  const countText = count === "all" ? "все" : count;
  const text = `📊 Выберите тип логов (выбрано: ${countText}):`;

  bot.editMessageText(text, {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: {
      inline_keyboard: [
        [{ text: "✅ Успешные", callback_data: "select_type_success" }],
        [{ text: "❌ С ошибками", callback_data: "select_type_error" }],
        [{ text: "📋 Все типы", callback_data: "select_type_all" }],
        [{ text: "↩️ Назад к выбору количества", callback_data: "get_logs" }],
        [{ text: "🏠 Главное меню", callback_data: "main_menu" }],
      ],
    },
  });
}

// Получение логов
async function getAllLogs(bot, chatId, messageId, count, type) {
  try {
    // Преобразуем count в число (если не 'all')
    const countNum = count === "all" ? null : parseInt(count);

    const getLogs = await Logs.getAllLogs({
      count: countNum,
      type: type === "all" ? null : type,
    });

    if (getLogs.length === 0) {
      bot.editMessageText("📭 Логов не найдено", {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔄 Попробовать снова", callback_data: "get_logs" }],
            [{ text: "🏠 Главное меню", callback_data: "main_menu" }],
          ],
        },
      });
      return;
    }

    const formattedLogs = getLogs
      .map(
        (log) =>
          `🆔 ID: ${log.id}
👤 Email: ${log.email}
📋 Method: ${log.method}
📦 Payload: ${log.payload.substring(0, 50)}${
            log.payload.length > 50 ? "..." : ""
          }
📍 From: ${log.from}
✅ Status: ${log.status}
${
  log.error
    ? `❌ Error: ${log.error.substring(0, 50)}${
        log.error.length > 50 ? "..." : ""
      }`
    : ""
}
────────────────────`
      )
      .join("\n");

    const countText = count === "all" ? "все" : count;
    const typeText = type === "all" ? "всех типов" : type;

    const text = `📊 Логи (${countText} ${typeText}):\n\n${formattedLogs}`;

    bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔄 Новый запрос", callback_data: "get_logs" }],
          [{ text: "🏠 Главное меню", callback_data: "main_menu" }],
        ],
      },
    });
  } catch (error) {
    console.error("Error getting logs:", error);
    bot.editMessageText("❌ Ошибка при получении логов", {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔄 Попробовать снова", callback_data: "get_logs" }],
          [{ text: "🏠 Главное меню", callback_data: "main_menu" }],
        ],
      },
    });
  }
}

function handleStatus(bot, chatId, messageId) {
  const text = `🖥️ Статус сервера:\n✅ Работает\n📊 Порт: ${
    process.env.PORT || 3000
  }`;

  bot.editMessageText(text, {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔄 Обновить", callback_data: "get_status" }],
        [{ text: "↩️ Назад", callback_data: "main_menu" }],
      ],
    },
  });
}

function handleTestLog(bot, chatId, messageId, sendLog) {
  sendLog({
    level: "INFO",
    message: "Тест из кнопки",
    source: "Button",
  });

  bot.editMessageText("✅ Лог отправлен!", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: {
      inline_keyboard: [[{ text: "↩️ Назад", callback_data: "main_menu" }]],
    },
  });
}

function handleSubscribe(bot, chatId, messageId, logSubscribers) {
  logSubscribers.add(chatId);

  bot.editMessageText("✅ Подписались на логи!", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: {
      inline_keyboard: [[{ text: "↩️ Назад", callback_data: "main_menu" }]],
    },
  });
}

function handleUnsubscribe(bot, chatId, messageId, logSubscribers) {
  logSubscribers.delete(chatId);

  bot.editMessageText("✅ Отписались от логов!", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: {
      inline_keyboard: [[{ text: "↩️ Назад", callback_data: "main_menu" }]],
    },
  });
}

function handleMainMenu(bot, chatId, messageId) {
  const text = "🤖 Главное меню:";

  bot.editMessageText(text, {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: {
      inline_keyboard: [
        [{ text: "📊 Получить логи", callback_data: "get_logs" }],
        [{ text: "🖥️ Статус сервера", callback_data: "get_status" }],
        [{ text: "📨 Тест лога", callback_data: "test_log" }],
        [{ text: "✅ Подписаться", callback_data: "subscribe" }],
        [{ text: "❌ Отписаться", callback_data: "unsubscribe" }],
      ],
    },
  });
}

// Функция для создания меню
function createMainMenu(bot, chatId) {
  const text = "🤖 Главное меню:";

  bot.sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📊 Получить логи", callback_data: "get_logs" }],
        [{ text: "🖥️ Статус сервера", callback_data: "get_status" }],
        [{ text: "📨 Тест лога", callback_data: "test_log" }],
        [{ text: "✅ Подписаться", callback_data: "subscribe" }],
        [{ text: "❌ Отписаться", callback_data: "unsubscribe" }],
      ],
    },
  });
}

module.exports = {
  registerButtonHandlers,
  createMainMenu,
};
