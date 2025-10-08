const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();

// Проверяем наличие обязательных переменных
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN не найден в .env файле");
  process.exit(1);
}

if (!process.env.LOG_GROUP_ID) {
  console.error("❌ LOG_GROUP_ID не найден в .env файле");
  process.exit(1);
}

// Конфигурация бота для групп
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  polling: {
    interval: 300,
    autoStart: true,
    params: {
      timeout: 10,
    },
  },
  onlyFirstMatch: true,
  request: {
    timeout: 10000,
  },
});

// Глобальные переменные для групп
const groupSettings = new Map(); // Настройки для каждой группы
const errorStats = new Map(); // Статистика ошибок
const rateLimitCache = new Map(); // Защита от спама

// Конфигурация логгера
const LOGGER_CONFIG = {
  maxMessageLength: 4000, // Максимальная длина сообщения в Telegram
  truncateLength: 1000, // Длина обрезки длинных текстов
  rateLimit: {
    windowMs: 60000, // 1 минута
    maxRequests: 10, // максимум 10 запросов в минуту
  },
  levels: {
    ERROR: { emoji: "🚨", priority: 4 },
    WARN: { emoji: "⚠️", priority: 3 },
    INFO: { emoji: "ℹ️", priority: 2 },
    DEBUG: { emoji: "🔍", priority: 1 },
  },
};

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

// Функция проверки rate limit
const checkRateLimit = (source) => {
  const now = Date.now();
  const windowMs = LOGGER_CONFIG.rateLimit.windowMs;

  if (!rateLimitCache.has(source)) {
    rateLimitCache.set(source, []);
  }

  const requests = rateLimitCache.get(source);
  const windowStart = now - windowMs;

  // Удаляем старые запросы
  while (requests.length > 0 && requests[0] < windowStart) {
    requests.shift();
  }

  // Проверяем лимит
  if (requests.length >= LOGGER_CONFIG.rateLimit.maxRequests) {
    return false;
  }

  requests.push(now);
  return true;
};

// Функция для обрезки длинного текста
const truncateText = (text, maxLength = LOGGER_CONFIG.truncateLength) => {
  if (!text || text.length <= maxLength) return text;
  return (
    text.substring(0, maxLength) +
    `\n... [обрезано, всего ${text.length} символов]`
  );
};

// Функция форматирования стека ошибок
const formatErrorStack = (error) => {
  if (!error) return "No error details";

  if (typeof error === "string") return error;
  if (error instanceof Error) {
    return `${error.name}: ${error.message}\n${
      error.stack || "No stack trace"
    }`;
  }
  if (typeof error === "object") {
    try {
      return JSON.stringify(error, null, 2);
    } catch {
      return String(error);
    }
  }

  return String(error);
};

// Основная функция для отправки ошибок в группу
const sendErrorToGroup = async (logData, options = {}) => {
  try {
    // Если LOG_GROUP_ID не указан, пропускаем отправку
    if (!process.env.LOG_GROUP_ID) {
      console.warn("⚠️ LOG_GROUP_ID не указан. Пропускаем отправку в группу");
      return { success: false, reason: "no_group_id" };
    }

    const {
      level = "ERROR",
      message = "",
      error = "",
      method = "unknown",
      domain = "unknown",
      endpoint = "unknown",
      status = "error",
      server = "unknown",
      email = "unknown",
      payload = "",
      timestamp = new Date(),
    } = logData;

    // Проверяем rate limit
    if (!checkRateLimit(server)) {
      console.warn(`⚠️ Rate limit exceeded for server: ${server}`);
      return { success: false, reason: "rate_limit" };
    }

    const levelConfig =
      LOGGER_CONFIG.levels[level.toUpperCase()] || LOGGER_CONFIG.levels.ERROR;

    // Форматируем сообщение об ошибке
    const errorMessage = formatErrorStack(error || message);
    const truncatedError = truncateText(errorMessage);

    // Форматируем payload
    let payloadText = "No payload";
    if (payload) {
      try {
        if (typeof payload === "string") {
          payloadText = truncateText(payload);
        } else {
          payloadText = truncateText(JSON.stringify(payload, null, 2));
        }
      } catch {
        payloadText = "Unable to stringify payload";
      }
    }

    // Создаем форматированное сообщение на основе существующих данных
    const formattedMessage = `
${levelConfig.emoji} <b>${level.toUpperCase()}: Ошибка в приложении</b>

🕒 <b>Время:</b> <code>${timestamp.toLocaleString("ru-RU")}</code>
👤 <b>Пользователь:</b> <code>${escapeHtml(email)}</code>
🏢 <b>Сервер:</b> <code>${escapeHtml(server)}</code>
🌐 <b>Домен:</b> <code>${escapeHtml(domain)}</code>

📋 <b>Метод:</b> <code>${escapeHtml(method)}</code>
📍 <b>Endpoint:</b> <code>${escapeHtml(endpoint)}</code>
✅ <b>Статус:</b> <code>${escapeHtml(status)}</code>

🚨 <b>Ошибка:</b>
<pre><code>${escapeHtml(truncatedError)}</code></pre>

📦 <b>Данные:</b>
<pre><code>${escapeHtml(payloadText)}</code></pre>
    `.trim();

    // Опции отправки
    const sendOptions = {
      parse_mode: "HTML",
      disable_web_page_preview: true,
      disable_notification: level === "INFO", // Уведомления для ERROR и WARN
      ...options,
    };

    // Отправляем сообщение
    const result = await bot.sendMessage(
      process.env.LOG_GROUP_ID,
      formattedMessage,
      sendOptions
    );

    // Обновляем статистику
    updateErrorStats(level, server);

    console.log(`✅ Ошибка отправлена в группу от пользователя: ${email}`);
    return { success: true, messageId: result.message_id };
  } catch (error) {
    console.error("❌ Ошибка отправки в группу:", error.message);
    return { success: false, reason: "send_failed", error: error.message };
  }
};

// Функция для отправки критических ошибок (с уведомлениями)
const sendCriticalError = async (error, context = {}) => {
  // return sendErrorToGroup(
  //   {
  //     level: "ERROR",
  //     title: "КРИТИЧЕСКАЯ ОШИБКА",
  //     error,
  //     context,
  //     source: "critical",
  //   },
  //   {
  //     disable_notification: false, // Всегда уведомляем для критических ошибок
  //   }
  // );
};

// Функция для отправки предупреждений
const sendWarning = async (warning, context = {}) => {
  // return sendErrorToGroup({
  //   level: "WARN",
  //   title: "Предупреждение",
  //   error: warning,
  //   context,
  //   source: "warning",
  // });
};

// Функция для информационных сообщений
const sendInfo = async (info, context = {}) => {
  // return sendErrorToGroup({
  //   level: "INFO",
  //   title: "Информация",
  //   error: info,
  //   context,
  //   source: "info",
  // });
};

// Обновление статистики ошибок
const updateErrorStats = (level, source) => {
  const key = `${level}_${source}`;
  const stats = errorStats.get(key) || { count: 0, lastOccurred: new Date() };
  stats.count++;
  stats.lastOccurred = new Date();
  errorStats.set(key, stats);
};

// Получение статистики ошибок
const getErrorStats = () => {
  const stats = {};
  errorStats.forEach((value, key) => {
    stats[key] = { ...value };
  });
  return stats;
};

// Функция для отправки отчета по статистике
const sendStatsReport = async (groupId = process.env.LOG_GROUP_ID) => {
  const stats = getErrorStats();

  if (Object.keys(stats).length === 0) {
    // return sendErrorToGroup(
    //   {
    //     level: "INFO",
    //     title: "Отчет по ошибкам",
    //     error: "Нет данных об ошибках",
    //     source: "stats",
    //   },
    //   { groupId }
    // );
  }

  let statsText = "📊 <b>Статистика ошибок:</b>\n\n";

  Object.entries(stats).forEach(([key, data]) => {
    const [level, source] = key.split("_");
    const levelConfig =
      LOGGER_CONFIG.levels[level] || LOGGER_CONFIG.levels.INFO;
    statsText += `${levelConfig.emoji} <b>${level}</b> от <code>${source}</code>\n`;
    statsText += `   📈 Количество: <code>${data.count}</code>\n`;
    statsText += `   ⏰ Последняя: <code>${data.lastOccurred.toLocaleString(
      "ru-RU"
    )}</code>\n\n`;
  });

  // return sendErrorToGroup(
  //   {
  //     level: "INFO",
  //     title: "Отчет по ошибкам",
  //     error: statsText,
  //     source: "stats_report",
  //   },
  //   { groupId }
  // );
};

// Обработчики для групповых команд
bot.onText(/\/log_error (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const errorText = match[1];

  if (msg.chat.type === "group" || msg.chat.type === "supergroup") {
    sendErrorToGroup({
      level: "ERROR",
      title: "Ручной лог ошибки",
      error: errorText,
      source: "manual",
      groupId: chatId,
    });
  }
});

bot.onText(/\/log_warning (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const warningText = match[1];

  if (msg.chat.type === "group" || msg.chat.type === "supergroup") {
    sendWarning(warningText, { manual: true, groupId: chatId });
  }
});

bot.onText(/\/stats/, (msg) => {
  const chatId = msg.chat.id;

  if (msg.chat.type === "group" || msg.chat.type === "supergroup") {
    sendStatsReport(chatId);
  }
});

// Обработчик ошибок бота
bot.on("error", (error) => {
  console.error("❌ Ошибка бота Telegram:", error);
  sendCriticalError(error, { component: "telegram_bot" });
});

// Обработчик polling ошибок
bot.on("polling_error", (error) => {
  console.error("❌ Ошибка polling:", error);
  sendCriticalError(error, { component: "telegram_polling" });
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("🛑 Остановка бота...");
  sendInfo("Бот останавливается", { reason: "SIGINT" }).then(() => {
    bot.stopPolling();
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("🛑 Остановка бота...");
  sendInfo("Бот останавливается", { reason: "SIGTERM" }).then(() => {
    bot.stopPolling();
    process.exit(0);
  });
});

console.log("🤖 Бот-логгер запущен и готов к работе в группах!");

// Экспортируем функции для использования в других модулях
module.exports = {
  bot,
  sendErrorToGroup,
  sendCriticalError,
  sendWarning,
  sendInfo,
  sendStatsReport,
  getErrorStats,
  escapeHtml,
  truncateText,
  formatErrorStack,
};
