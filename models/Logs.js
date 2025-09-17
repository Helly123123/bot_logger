const pool = require("../config/db");

class Logs {
  static async getAllLogs(server, domain) {
    console.log("Server:", server, "Domain:", domain);

    // Проверка на валидность server
    if (!server || typeof server !== "string") {
      throw new Error("Server parameter is required and must be a string");
    }

    const tableMap = {
      be_pay: "be_pay_logs",
      frontend_vue: "frontend_vue_logs",
      be_auth: "be_auth_logs",
    };

    if (!tableMap[server]) {
      throw new Error(
        `Unknown server: ${server}. Available: ${Object.keys(tableMap).join(
          ", "
        )}`
      );
    }

    const tableName = tableMap[server];
    let query = `SELECT * FROM ${tableName}`;
    let params = [];

    if (domain && typeof domain === "string") {
      query += " WHERE server = ?";
      params = [domain];
    } else if (domain) {
      // Если domain передан, но не строка
      throw new Error("Domain parameter must be a string");
    }

    try {
      const [rows] = await pool.query(query, params);
      console.log("Found rows:", rows.length);

      return { rows };
    } catch (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Database error: " + dbError.message);
    }
  }

  // static async getAllLogs(options = {}) {
  //   const { count = null, type = null } = options;

  //   try {
  //     let query = `SELECT * FROM be_pay_logs`;
  //     let queryParams = [];

  //     // Добавляем фильтр по типу
  //     if (type && type !== "all") {
  //       query += ` WHERE status = ?`;
  //       queryParams.push(type);
  //     }

  //     // Сортируем по ID
  //     query += ` ORDER BY id DESC`;

  //     // Добавляем лимит если указано количество
  //     if (count) {
  //       query += ` LIMIT ?`;
  //       queryParams.push(count);
  //     }

  //     const [rows] = await pool.query(query, queryParams);
  //     return rows;
  //   } catch (error) {
  //     console.error("Error getting logs:", error);
  //     throw error;
  //   }
  // }

  static async create(userData) {
    const {
      email,
      method,
      payload,
      status,
      error,
      server,
      domain,
      level,
      message,
      endpoint,
    } = userData;

    function generateSixDigitId() {
      return Math.floor(100000 + Math.random() * 900000);
    }

    const id = generateSixDigitId();
    const timestamp = Math.floor(Date.now() / 1000);

    // Маппинг серверов к таблицам логов
    const serverTableMap = {
      frontend_vue: "frontend_vue_logs",
      be_auth: "be_auth_logs",
      be_pay: "be_pay_logs",
    };

    const tableName = serverTableMap[domain] || "be_pay_logs";

    try {
      // Проверяем структуру таблицы и адаптируем запрос
      let query, params;

      if (tableName === "frontend_vue_logs") {
        // Для frontend_vue_logs без колонки error
        query = `INSERT INTO ${tableName} 
              (id, server, email, timestamp, method, payload, status, level, message, endpoint) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        params = [
          id,
          server,
          email,
          timestamp,
          method,
          payload,
          status,
          level || "INFO",
          message || "",
          endpoint || "",
        ];
      } else {
        // Для других таблиц с колонкой error
        query = `INSERT INTO ${tableName} 
              (id, server, email, timestamp, method, payload, status, error, level, message, endpoint) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        params = [
          id,
          server,
          email,
          timestamp,
          method,
          payload,
          status,
          error || "",
          level || "INFO",
          message || "",
          endpoint || "",
        ];
      }

      const [result] = await pool.query(query, params);

      console.log(result);
      return {
        id,
        server,
        email,
        timestamp,
        method,
        payload,
        status,
        error,
        level,
        message,
        endpoint,
      };
    } catch (error) {
      console.error("Ошибка создания лога:", error);
      throw error;
    }
  }
}

module.exports = Logs;
