const pool = require("../config/db");

class Logs {
  static async getAllLogs(server, domain) {
    console.log("Server:", server, "Domain:", domain);

    let query = `SELECT * FROM ${server}`;
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
      type,
      message,
      endpoint,
    } = userData;

    function generateSixDigitId() {
      return Math.floor(100000 + Math.random() * 900000);
    }

    const id = generateSixDigitId();
    const timestamp = Math.floor(Date.now() / 1000);

    const serverTableMap = {
      frontend_vue: "frontend_vue_logs",
      be_auth: "be_auth_logs",
      be_pay: "be_pay_logs",
    };

    const tableName = serverTableMap[domain] || "be_pay_logs";

    try {
      // Проверяем структуру таблицы и адаптируем запрос
      let query, params;

      if (
        tableName === "frontend_vue_logs" ||
        tableName === "frontend_vue_dev_logs"
      ) {
        query = `INSERT INTO ${type} 
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
