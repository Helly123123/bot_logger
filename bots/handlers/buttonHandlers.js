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

function selectLogsCount(bot, chatId, messageId) {
  const text = "📊 Выберите количество логов:";

  bot.editMessageText(text, {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: {
      inline_keyboard: [
        [{ text: "3 лога", callback_data: "select_count_3" }],
        [{ text: "5 логов", callback_data: "select_count_5" }],
        [{ text: "10 логов", callback_data: "select_count_10" }],
        [{ text: "Все логи", callback_data: "select_count_all" }],
        [{ text: "↩️ Назад", callback_data: "main_menu" }],
      ],
    },
  });
}

// Выбор типа логов
function selectLogType(bot, chatId, messageId, count) {
  const countText = count === "all" ? "все" : count;
  const text = `📊 Выберите тип логов (количество: ${countText}):`;

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

async function getAllLogs(bot, chatId, messageId, count, type) {
  try {
    console.log("Getting logs with count:", count, "type:", type);

    const countNum = count === "all" ? null : parseInt(count);
    const getLogs = await Logs.getAllLogs({
      count: countNum,
      type: type === "all" ? null : type,
    });

    console.log("Found logs:", getLogs.length);

    if (getLogs.length === 0) {
      return bot.editMessageText("📭 Логов не найдено", {
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

    // Простое текстовое форматирование с emoji и разделителями
    const formatLogEntry = (log, index) => {
      const payloadText = log.payload
        ? `════════════════════════════════════════\n${log.payload}\n════════════════════════════════════════`
        : "❌ Нет данных";

      const errorText = log.error
        ? `════════════════════════════════════════\n${log.error}\n════════════════════════════════════════`
        : "✅ Нет ошибок";

      return `
🔸 ЛОГ #${index + 1}
─────────────────────────────
🆔 ID: ${log.id}
👤 Email: ${log.email || "❌ Нет email"}
📋 Method: ${log.method}
📍 From: ${log.from}
✅ Status: ${log.status}

📦 PAYLOAD:
${payloadText}

❌ ERROR:
${errorText}
─────────────────────────────
`;
    };

    // Форматируем первые 2 лога для основного сообщения
    const formattedLogs = getLogs
      .slice(0, 2)
      .map((log, index) => formatLogEntry(log, index))
      .join("\n");

    const countText = count === "all" ? "все" : count;
    const typeText = type === "all" ? "всех типов" : type;
    const totalLogs = getLogs.length;

    const text = `📊 ЛОГИ СЕРВЕРА
─────────────────────────────
Количество: ${countText}
Тип: ${typeText}
Всего найдено: ${totalLogs}
─────────────────────────────
${formattedLogs}`;

    // Если логов больше 2, добавляем информацию
    if (totalLogs > 2) {
      const remaining = totalLogs - 2;
      const additionalText = `\n\n📋 Показано 2 из ${totalLogs} логов\n▶️ Используйте меньшее количество для полного отображения`;

      await bot.editMessageText(text + additionalText, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [
            [
              { text: "3 лога", callback_data: "select_count_3" },
              { text: "5 логов", callback_data: "select_count_5" },
            ],
            [
              { text: "10 логов", callback_data: "select_count_10" },
              { text: "Все логи", callback_data: "select_count_all" },
            ],
            [{ text: "↩️ Назад", callback_data: "main_menu" }],
          ],
        },
      });
    } else {
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔄 Новый запрос", callback_data: "get_logs" }],
            [{ text: "🏠 Главное меню", callback_data: "main_menu" }],
          ],
        },
      });
    }

    // Отправляем остальные логи по частям
    if (totalLogs > 2) {
      for (let i = 2; i < totalLogs; i += 2) {
        const batch = getLogs.slice(i, i + 2);
        const batchText = batch
          .map((log, batchIndex) => formatLogEntry(log, i + batchIndex))
          .join("\n");

        await bot.sendMessage(
          chatId,
          `📋 Продолжение логов (${i + 1}-${Math.min(
            i + 2,
            totalLogs
          )} из ${totalLogs}):\n${batchText}`
        );
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  } catch (error) {
    console.error("Error getting logs:", error);

    // Простой fallback
    await bot.editMessageText(
      "❌ Ошибка при получении логов\n\nВозможно, слишком много данных. Попробуйте выбрать меньшее количество.",
      {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [
            [
              { text: "3 лога", callback_data: "select_count_3" },
              { text: "5 логов", callback_data: "select_count_5" },
            ],
            [{ text: "🏠 Главное меню", callback_data: "main_menu" }],
          ],
        },
      }
    );
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
