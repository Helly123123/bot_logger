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
  const text = `📊 Выберите количество логов:`;

  bot.editMessageText(text, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "5 логов", callback_data: "select_count_5" }],
        [{ text: "10 логов", callback_data: "select_count_10" }],
        [{ text: "20 логов", callback_data: "select_count_20" }],
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

async function getAllLogs(bot, chatId, messageId, count, type) {
  try {
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

    // Форматируем логи с HTML-разметкой
    const formatLogEntry = (log, index) => {
      return `🔸 <b>Log ${index + 1}</b>
┌─────────────────────────────
│ 🆔 <b>ID:</b> <code>${escapeHtml(log.id.toString())}</code>
│ 👤 <b>Email:</b> <code>${escapeHtml(log.email) || "No email"}</code>
│ 📋 <b>Method:</b> <code>${escapeHtml(log.method)}</code>
│ 📍 <b>From:</b> <code>${escapeHtml(log.from)}</code>
│ ✅ <b>Status:</b> <code>${escapeHtml(log.status)}</code>
│ 
│ 📦 <b>Payload:</b>
<pre><code>${escapeHtml(log.payload) || "No payload"}</code></pre>
│ 
│ ❌ <b>Error:</b>
<pre><code>${escapeHtml(log.error) || "No errors"}</code></pre>
└─────────────────────────────`;
    };

    // Функция для экранирования HTML
    function escapeHtml(text) {
      if (!text) return "";
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    // Первые 3 лога в основном сообщении
    const formattedLogs = getLogs
      .slice(0, 3)
      .map((log, index) => formatLogEntry(log, index))
      .join("\n\n");

    const countText = count === "all" ? "все" : count;
    const typeText = type === "all" ? "всех типов" : type;
    const totalLogs = getLogs.length;

    const text = `📊 <b>Логи сервера</b> (${countText} ${typeText})\n<b>Всего найдено:</b> ${totalLogs}\n\n${formattedLogs}`;

    if (totalLogs > 3) {
      const remaining = totalLogs - 3;
      const additionalText = `\n\n📋 <i>И еще ${remaining} логов...</i>\n<code>Используйте меньшее количество для полного отображения</code>`;

      await bot.editMessageText(text + additionalText, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "5 логов", callback_data: "select_count_5" },
              { text: "10 логов", callback_data: "select_count_10" },
            ],
            [
              { text: "20 логов", callback_data: "select_count_20" },
              { text: "Все логи", callback_data: "select_count_all" },
            ],
            [{ text: "🏠 Главное меню", callback_data: "main_menu" }],
          ],
        },
      });
    } else {
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔄 Новый запрос", callback_data: "get_logs" }],
            [{ text: "🏠 Главное меню", callback_data: "main_menu" }],
          ],
        },
      });
    }

    // Отправляем остальные логи отдельными сообщениями
    if (totalLogs > 3) {
      for (let i = 3; i < totalLogs; i += 2) {
        const batch = getLogs.slice(i, i + 2);
        const batchText = batch
          .map((log, batchIndex) => formatLogEntry(log, i + batchIndex))
          .join("\n\n");

        await bot.sendMessage(chatId, batchText, {
          parse_mode: "HTML",
        });

        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
  } catch (error) {
    console.error("Error getting logs:", error);

    // Fallback на простой текст
    try {
      const getLogs = await Logs.getAllLogs({
        count: 5,
        type: type === "all" ? null : type,
      });

      const simplifiedLogs = getLogs
        .map((log, index) => {
          return `🔸 Log ${index + 1}
ID: ${log.id}
Email: ${log.email || "No email"}
Method: ${log.method}
From: ${log.from}
Status: ${log.status}
Payload: ${
            log.payload
              ? log.payload.substring(0, 60) +
                (log.payload.length > 60 ? "..." : "")
              : "No payload"
          }
Error: ${
            log.error
              ? log.error.substring(0, 60) +
                (log.error.length > 60 ? "..." : "")
              : "No errors"
          }
────────────────────`;
        })
        .join("\n\n");

      const text = `📊 Логи сервера\n\n${simplifiedLogs}`;

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
    } catch (fallbackError) {
      console.error("Fallback error:", fallbackError);
      await bot.editMessageText("❌ Ошибка при получении логов", {
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
