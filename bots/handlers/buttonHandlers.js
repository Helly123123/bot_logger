const Logs = require("../../models/Logs");
const fs = require("fs");
const path = require("path");
const pool = require("../../config/db");

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

      // Добавьте в switch-case обработчиков
      case data === "export_menu":
        handleExportMenu(bot, chatId, messageId);
        break;

      case data === "export_all":
        exportLogs(bot, chatId, messageId, "all");
        break;

      case data === "export_success":
        exportLogs(bot, chatId, messageId, "success");
        break;

      case data === "export_errors":
        exportLogs(bot, chatId, messageId, "error");
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

      case data === "memory_stats":
        handleMemoryStats(bot, chatId, messageId);
        break;

      case data === "cpu_stats":
        handleCpuStats(bot, chatId, messageId);
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

async function handleStatus(bot, chatId, messageId) {
  try {
    const os = require("os");
    const process = require("process");

    // Получаем базовую статистику логов
    let logsStats = { total: 0, success: 0, error: 0 };
    try {
      // Простой запрос для подсчета логов
      const [allLogs] = await pool.query(
        "SELECT COUNT(*) as total FROM be_pay_logs"
      );
      const [successLogs] = await pool.query(
        "SELECT COUNT(*) as success FROM be_pay_logs WHERE status = 'success'"
      );
      const [errorLogs] = await pool.query(
        "SELECT COUNT(*) as error FROM be_pay_logs WHERE status = 'error'"
      );

      logsStats = {
        total: allLogs[0].total,
        success: successLogs[0].success,
        error: errorLogs[0].error,
      };
    } catch (dbError) {
      console.error("Database stats error:", dbError);
    }

    // Статистика памяти
    const totalMemGB = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
    const freeMemGB = (os.freemem() / 1024 / 1024 / 1024).toFixed(1);
    const usedMemGB = (totalMemGB - freeMemGB).toFixed(1);
    const memoryUsagePercent = ((usedMemGB / totalMemGB) * 100).toFixed(1);

    // Использование памяти процессом
    const memoryUsage = process.memoryUsage();
    const rssMB = (memoryUsage.rss / 1024 / 1024).toFixed(1);
    const heapTotalMB = (memoryUsage.heapTotal / 1024 / 1024).toFixed(1);
    const heapUsedMB = (memoryUsage.heapUsed / 1024 / 1024).toFixed(1);

    // Нагрузка CPU
    const loadAverage = os.loadavg();
    const cpuLoad = loadAverage[0].toFixed(2); // 1-minute average

    // Время работы системы и процесса
    const systemUptime = formatUptime(os.uptime());
    const processUptime = formatUptime(process.uptime());

    // Информация о процессе
    const nodeVersion = process.version;
    const platform = `${os.platform()} ${os.arch()}`;

    const text = `
🖥️ <b>СТАТИСТИКА СЕРВЕРА</b>
┌─────────────────────────────
│ <b>📊 СТАТИСТИКА ЛОГОВ:</b>
│ 📈 <b>Всего логов:</b> ${logsStats.total}
│ ✅ <b>Успешных:</b> ${logsStats.success}
│ ❌ <b>Ошибок:</b> ${logsStats.error}
│ 📊 <b>Процент успеха:</b> ${
      logsStats.total > 0
        ? ((logsStats.success / logsStats.total) * 100).toFixed(1)
        : 0
    }%
│ 
│ <b>💾 ПАМЯТЬ СИСТЕМЫ:</b>
│ 🗃️ <b>Всего:</b> ${totalMemGB} GB
│ 💽 <b>Использовано:</b> ${usedMemGB} GB
│ 💿 <b>Свободно:</b> ${freeMemGB} GB
│ 📊 <b>Использование:</b> ${memoryUsagePercent}%
│ 
│ <b>🔧 ПАМЯТЬ ПРОЦЕССА:</b>
│ 📋 <b>RSS:</b> ${rssMB} MB
│ 🗂️ <b>Heap Total:</b> ${heapTotalMB} MB
│ 📝 <b>Heap Used:</b> ${heapUsedMB} MB
│ 
│ <b>⚡ НАГРУЗКА CPU:</b>
│ 🔄 <b>Нагрузка (1min):</b> ${cpuLoad}
│ 
│ <b>⏰ ВРЕМЯ РАБОТЫ:</b>
│ 🖥️ <b>Системы:</b> ${systemUptime}
│ 🚀 <b>Процесса:</b> ${processUptime}
│ 
│ <b>📋 ИНФОРМАЦИЯ:</b>
│ 🟢 <b>Node.js:</b> ${nodeVersion}
│ 🖥️ <b>Платформа:</b> ${platform}
│ 📡 <b>Порт:</b> ${process.env.PORT || 3000}
│ 📝 <b>Окружение:</b> ${process.env.NODE_ENV || "development"}
└─────────────────────────────
    `.trim();

    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🔄 Обновить", callback_data: "get_status" },
            { text: "📊 Логи", callback_data: "get_logs" },
          ],
          [
            { text: "💾 Память", callback_data: "memory_stats" },
            { text: "⚡ CPU", callback_data: "cpu_stats" },
          ],
          [{ text: "↩️ Назад", callback_data: "main_menu" }],
        ],
      },
    });
  } catch (error) {
    console.error("Error getting status:", error);

    const fallbackText = `
🖥️ <b>СТАТИСТИКА СЕРВЕРА</b>
┌─────────────────────────────
│ ✅ <b>Статус:</b> Работает
│ 📊 <b>Порт:</b> <code>${process.env.PORT || 3000}</code>
│ ⏰ <b>Время:</b> ${new Date().toLocaleString("ru-RU")}
│ 💾 <b>Память:</b> ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(
      2
    )} MB
└─────────────────────────────

❌ <i>Не удалось загрузить полную статистику: ${error.message}</i>
    `.trim();

    await bot.editMessageText(fallbackText, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔄 Попробовать снова", callback_data: "get_status" }],
          [{ text: "↩️ Назад", callback_data: "main_menu" }],
        ],
      },
    });
  }
}

// Вспомогательная функция для форматирования времени
function formatUptime(seconds) {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);

  if (days > 0) return `${days}д ${hours}ч ${minutes}м`;
  if (hours > 0) return `${hours}ч ${minutes}м`;
  return `${minutes}м`;
}

async function handleMemoryStats(bot, chatId, messageId) {
  try {
    const os = require("os");
    const process = require("process");

    const memoryUsage = process.memoryUsage();
    const totalMemGB = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
    const freeMemGB = (os.freemem() / 1024 / 1024 / 1024).toFixed(1);

    const text = `
💾 <b>ДЕТАЛЬНАЯ СТАТИСТИКА ПАМЯТИ</b>
┌─────────────────────────────
│ <b>Системная память:</b>
│ 🗃️ <b>Всего:</b> ${totalMemGB} GB
│ 💿 <b>Свободно:</b> ${freeMemGB} GB
│ 📊 <b>Использование:</b> ${((1 - freeMemGB / totalMemGB) * 100).toFixed(1)}%
│ 
│ <b>Память процесса:</b>
│ 📋 <b>RSS:</b> ${(memoryUsage.rss / 1024 / 1024).toFixed(1)} MB
│ 🗂️ <b>Heap Total:</b> ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(1)} MB
│ 📝 <b>Heap Used:</b> ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(1)} MB
│ 🔷 <b>External:</b> ${(memoryUsage.external / 1024 / 1024).toFixed(1)} MB
│ 📚 <b>Array Buffers:</b> ${(memoryUsage.arrayBuffers / 1024 / 1024).toFixed(
      1
    )} MB
└─────────────────────────────
    `.trim();

    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔄 Обновить", callback_data: "memory_stats" }],
          [{ text: "↩️ Назад к статистике", callback_data: "get_status" }],
        ],
      },
    });
  } catch (error) {
    console.error("Error getting memory stats:", error);
  }
}

async function handleCpuStats(bot, chatId, messageId) {
  try {
    const os = require("os");

    const loadAverage = os.loadavg();
    const cpus = os.cpus();
    const cpuModel = cpus[0].model;

    const text = `
⚡ <b>СТАТИСТИКА CPU</b>
┌─────────────────────────────
│ <b>Нагрузка системы:</b>
│ 🔄 <b>1 минута:</b> ${loadAverage[0].toFixed(2)}
│ 🔄 <b>5 минут:</b> ${loadAverage[1].toFixed(2)}
│ 🔄 <b>15 минут:</b> ${loadAverage[2].toFixed(2)}
│ 
│ <b>Информация о CPU:</b>
│ 🖥️ <b>Модель:</b> ${cpuModel}
│ 📊 <b>Ядер:</b> ${cpus.length}
│ ⚡ <b>Частота:</b> ${(cpus[0].speed / 1000).toFixed(1)} GHz
└─────────────────────────────
    `.trim();

    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔄 Обновить", callback_data: "cpu_stats" }],
          [{ text: "↩️ Назад к статистике", callback_data: "get_status" }],
        ],
      },
    });
  } catch (error) {
    console.error("Error getting CPU stats:", error);
  }
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
        [
          { text: "📊 Получить логи", callback_data: "get_logs" },
          { text: "💾 Экспорт логов", callback_data: "export_menu" },
        ],
        [{ text: "🖥️ Статус сервера", callback_data: "get_status" }],
        [],
      ],
    },
  });
}

function handleExportMenu(bot, chatId, messageId) {
  const text = "💾 Выберите тип экспорта:";

  bot.editMessageText(text, {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: {
      inline_keyboard: [
        [{ text: "📋 Все логи", callback_data: "export_all" }],
        [{ text: "✅ Успешные логи", callback_data: "export_success" }],
        [{ text: "❌ Логи с ошибками", callback_data: "export_errors" }],
        [{ text: "↩️ Назад", callback_data: "main_menu" }],
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
      ],
    },
  });
}

module.exports = {
  registerButtonHandlers,
  createMainMenu,
};

async function exportLogs(bot, chatId, messageId, type) {
  try {
    // Показываем сообщение о начале экспорта
    await bot.editMessageText("⏳ Подготавливаем файл для экспорта...", {
      chat_id: chatId,
      message_id: messageId,
    });

    // Получаем логи из базы данных
    let logs;
    switch (type) {
      case "success":
        logs = await Logs.getAllLogs({ type: "success" });
        break;
      case "error":
        logs = await Logs.getAllLogs({ type: "error" });
        break;
      default:
        logs = await Logs.getAllLogs();
    }

    if (!logs || logs.length === 0) {
      await bot.editMessageText("📭 Нет логов для экспорта", {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [
            [{ text: "↩️ Назад", callback_data: "export_menu" }],
          ],
        },
      });
      return;
    }

    // Создаем временную папку если не существует
    const tempDir = path.join(__dirname, "..", "..", "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Создаем файлы в разных форматах
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filenameBase = `logs_${type}_${timestamp}`;

    // JSON файл
    const jsonFilename = `${filenameBase}.json`;
    const jsonPath = path.join(tempDir, jsonFilename);
    fs.writeFileSync(jsonPath, JSON.stringify(logs, null, 2));

    // CSV файл
    const csvFilename = `${filenameBase}.csv`;
    const csvPath = path.join(tempDir, csvFilename);
    const csvContent = convertToCSV(logs);
    fs.writeFileSync(csvPath, csvContent);

    // TXT файл
    const txtFilename = `${filenameBase}.txt`;
    const txtPath = path.join(tempDir, txtFilename);
    const txtContent = convertToTXT(logs);
    fs.writeFileSync(txtPath, txtContent);

    // Отправляем файлы пользователю
    const typeText = {
      all: "все логи",
      success: "успешные логи",
      error: "логи с ошибками",
    }[type];

    await bot.sendMessage(
      chatId,
      `✅ Экспорт завершен! ${logs.length} ${typeText}`
    );

    // Отправляем JSON файл
    await bot.sendDocument(chatId, jsonPath, {
      caption: `📊 ${logs.length} ${typeText} (JSON)`,
    });

    // Отправляем CSV файл
    await bot.sendDocument(chatId, csvPath, {
      caption: `📈 ${logs.length} ${typeText} (CSV)`,
    });

    // Отправляем TXT файл
    await bot.sendDocument(chatId, txtPath, {
      caption: `📝 ${logs.length} ${typeText} (TXT)`,
    });

    // Очищаем временные файлы
    setTimeout(() => {
      [jsonPath, csvPath, txtPath].forEach((filePath) => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }, 30000);

    // Показываем меню экспорта
    await bot.sendMessage(chatId, "💾 Выберите тип экспорта:", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📋 Все логи", callback_data: "export_all" }],
          [{ text: "✅ Успешные логи", callback_data: "export_success" }],
          [{ text: "❌ Логи с ошибками", callback_data: "export_errors" }],
          [{ text: "↩️ Назад в меню", callback_data: "main_menu" }],
        ],
      },
    });
  } catch (error) {
    console.error("Error exporting logs:", error);

    await bot.editMessageText("❌ Ошибка при экспорте логов", {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔄 Попробовать снова", callback_data: `export_${type}` }],
          [{ text: "↩️ Назад", callback_data: "export_menu" }],
        ],
      },
    });
  }
}

// Функция конвертации в CSV
function convertToCSV(logs) {
  if (!logs || logs.length === 0) return "";

  const headers = [
    "ID",
    "Email",
    "Method",
    "From",
    "Status",
    "Payload",
    "Error",
    "Created_At",
  ];
  const csvRows = [headers.join(",")];

  logs.forEach((log) => {
    const row = [
      log.id,
      `"${log.email || ""}"`,
      `"${log.method || ""}"`,
      `"${log.from || ""}"`,
      `"${log.status || ""}"`,
      `"${(log.payload || "").replace(/"/g, '""')}"`,
      `"${(log.error || "").replace(/"/g, '""')}"`,
      `"${log.created_at || new Date().toISOString()}"`,
    ];
    csvRows.push(row.join(","));
  });

  return csvRows.join("\n");
}

// Функция конвертации в TXT
function convertToTXT(logs) {
  if (!logs || logs.length === 0) return "No logs found";

  return logs
    .map((log, index) => {
      return `
🔸 LOG ${index + 1}
────────────────
🆔 ID: ${log.id}
👤 Email: ${log.email || "N/A"}
📋 Method: ${log.method}
📍 From: ${log.from}
✅ Status: ${log.status}
⏰ Created: ${log.created_at || "N/A"}

📦 Payload:
${log.payload || "No payload"}

❌ Error:
${log.error || "No errors"}
─────────────────────────────────────
    `.trim();
    })
    .join("\n\n");
}
