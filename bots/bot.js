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

// Функция для экранирования HTML
const escapeHtml = (text) => {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// Функция для форматирования лога сервера (как вы хотите)
const formatServerLog = (logData) => {
  const {
    id,
    email,
    method,
    from,
    status,
    payload,
    error,
    level = "INFO",
    timestamp = new Date().toLocaleString("ru-RU"),
  } = logData;

  return `
┌─────────────────────────────
│ 🆔 <b>ID:</b> <code>${escapeHtml(id?.toString() || "N/A")}</code>
│ 👤 <b>Email:</b> <code>${escapeHtml(email) || "No email"}</code>
│ 📋 <b>Method:</b> <code>${escapeHtml(method)}</code>
│ 📍 <b>From:</b> <code>${escapeHtml(from)}</code>
│ ✅ <b>Status:</b> <code>${escapeHtml(status)}</code>
│ 📊 <b>Level:</b> <code>${escapeHtml(level)}</code>
│ ⏰ <b>Time:</b> <code>${escapeHtml(timestamp)}</code>
│ 
│ 📦 <b>Payload:</b>
<pre><code>${escapeHtml(payload) || "No payload"}</code></pre>
│ 
│ ❌ <b>Error:</b>
<pre><code>${escapeHtml(error) || "No errors"}</code></pre>
└─────────────────────────────
  `.trim();
};

// Функция для отправки сообщений в группу
const sendToGroup = (message, options = {}) => {
  if (!process.env.LOG_GROUP_ID) {
    console.warn("⚠️ LOG_GROUP_ID не указан. Пропускаем отправку в группу");
    return;
  }

  const defaultOptions = {
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };

  bot
    .sendMessage(process.env.LOG_GROUP_ID, message, {
      ...defaultOptions,
      ...options,
    })
    .catch((error) => {
      console.error("❌ Ошибка отправки в группу:", error.message);
    });
};

// Функция для отправки логов сервера в группу
// Функция для отправки логов сервера в группу
const sendServerLog = (logData) => {
  try {
    // Обрабатываем payload (может быть строкой или объектом)
    let payloadText = logData.payload;
    if (typeof payloadText !== "string") {
      payloadText = JSON.stringify(payloadText, null, 2);
    }

    // Обрабатываем error
    const errorText = logData.error || "No errors";

    const formattedMessage = `
┌─────────────────────────────
│ 🆔 <b>ID:</b> <code>${escapeHtml(logData.id?.toString() || "N/A")}</code>
│ 👤 <b>Email:</b> <code>${escapeHtml(logData.email) || "No email"}</code>
│ 📋 <b>Method:</b> <code>${escapeHtml(logData.method)}</code>
│ 📍 <b>From:</b> <code>${escapeHtml(logData.from)}</code>
│ ✅ <b>Status:</b> <code>${escapeHtml(logData.status)}</code>
│ 📊 <b>Level:</b> <code>${escapeHtml(logData.level || "INFO")}</code>
│ ⏰ <b>Time:</b> <code>${new Date().toLocaleString("ru-RU")}</code>
│ 
│ 📦 <b>Payload:</b>
<pre><code>${escapeHtml(payloadText) || "No payload"}</code></pre>
│ 
│ ❌ <b>Error:</b>
<pre><code>${escapeHtml(errorText)}</code></pre>
└─────────────────────────────
    `.trim();

    // Добавляем заголовок с уровнем логирования
    const levelEmoji = {
      INFO: "📋",
      WARN: "⚠️",
      ERROR: "❌",
      DEBUG: "🔍",
      CRITICAL: "🚨",
    };

    const emoji = levelEmoji[logData.level] || "📋";
    const fullMessage = `${emoji} <b>СЕРВЕРНЫЙ ЛОГ [${
      logData.level || "INFO"
    }]</b>\n${formattedMessage}`;

    console.log(`[${logData.level || "INFO"}] Server log created:`, logData);

    // Отправляем в группу
    sendToGroup(fullMessage);
  } catch (error) {
    console.error("❌ Ошибка форматирования лога:", error);

    // Fallback: простой формат в случае ошибки
    const simpleMessage = `
🚨 <b>Ошибка форматирования лога</b>
📋 <b>Метод:</b> <code>${logData.method}</code>
📍 <b>От:</b> <code>${logData.from}</code>
❌ <b>Ошибка:</b> <code>${error.message}</code>
    `.trim();

    sendToGroup(simpleMessage);
  }
};

// Функция для конвертации HTML в Markdown (для подписчиков)
const convertHtmlToMarkdown = (html) => {
  return html
    .replace(/<b>/g, "**")
    .replace(/<\/b>/g, "**")
    .replace(/<code>/g, "`")
    .replace(/<\/code>/g, "`")
    .replace(/<pre>/g, "```\n")
    .replace(/<\/pre>/g, "\n```")
    .replace(/<br\/>/g, "\n")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
};

// Старая функция sendLog (для обратной совместимости)
const sendLog = (logData) => {
  const { level = "INFO", message, source, additionalData = {} } = logData;

  const timestamp = new Date().toLocaleString("ru-RU");
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
      .catch((error) => {
        console.error("❌ Ошибка отправки подписчику:", error.message);
        if (error.response?.statusCode === 403) {
          logSubscribers.delete(chatId);
        }
      });
  });

  // Отправляем в группу (если настроено)
  if (process.env.LOG_GROUP_ID) {
    sendToGroup(
      `
📊 <b>Лог [${level}]</b>
⏰ <b>Время:</b> <code>${timestamp}</code>
📝 <b>Сообщение:</b> ${message}
${source ? `🔗 <b>Источник:</b> <code>${source}</code>\n` : ""}
${
  Object.keys(additionalData).length > 0
    ? `📋 <b>Данные:</b>\n<pre><code>${JSON.stringify(
        additionalData,
        null,
        2
      )}</code></pre>`
    : ""
}
    `.trim()
    );
  }
};

// Импортируем обработчики
const { registerCommandHandlers } = require("./handlers/commandHandlers");
const { registerButtonHandlers } = require("./handlers/buttonHandlers");

// Регистрируем обработчики
registerCommandHandlers(
  bot,
  userSessions,
  logSubscribers,
  sendLog,
  sendServerLog
);
registerButtonHandlers(bot, userSessions, logSubscribers, sendLog);

// Команда для получения ID группы
bot.onText(/\/groupid/, (msg) => {
  const chatId = msg.chat.id;
  const chatType = msg.chat.type;

  if (chatType === "group" || chatType === "supergroup") {
    bot.sendMessage(
      chatId,
      `🆔 ID этой группы: <code>${chatId}</code>\n\nДобавьте его в .env как LOG_GROUP_ID`,
      {
        parse_mode: "HTML",
      }
    );
  } else {
    bot.sendMessage(
      chatId,
      "ℹ️ Эта команда работает только в группах и супергруппах"
    );
  }
});

// Команда для теста серверных логов
bot.onText(/\/test_server_log/, (msg) => {
  const chatId = msg.chat.id;

  sendServerLog({
    id: Math.floor(Math.random() * 1000000),
    email: "test@example.com",
    method: "payment",
    from: "web",
    status: "success",
    payload: JSON.stringify({ amount: 100, currency: "USD" }, null, 2),
    error: "",
    level: "INFO",
  });

  bot.sendMessage(chatId, "✅ Тестовый серверный лог отправлен в группу!");
});

console.log("🤖 Бот запущен!");

module.exports = {
  bot,
  userSessions,
  logSubscribers,
  sendLog,
  sendServerLog,
  sendToGroup,
  escapeHtml,
  formatServerLog,
};
