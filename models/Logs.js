const pool = require("../config/db");

class Logs {
  static async getAllLogs(options = {}) {
    const { count = null, type = null } = options;

    try {
      let query = `SELECT * FROM be_pay_logs`;
      let queryParams = [];

      // Добавляем фильтр по типу
      if (type && type !== "all") {
        query += ` WHERE status = ?`;
        queryParams.push(type);
      }

      // Сортируем по ID
      query += ` ORDER BY id DESC`;

      // Добавляем лимит если указано количество
      if (count) {
        query += ` LIMIT ?`;
        queryParams.push(count);
      }

      const [rows] = await pool.query(query, queryParams);
      return rows;
    } catch (error) {
      console.error("Error getting logs:", error);
      throw error;
    }
  }

    static async create(userData) {
    const { email, method, payload, status, error, server, level, message, endpoint } = userData;

    function generateSixDigitId() {
      return Math.floor(100000 + Math.random() * 900000);
    }

    const id = generateSixDigitId();
    const timestamp = Math.floor(Date.now() / 1000); // Текущее время в Unix timestamp

    const [result] = await pool.query(
      `INSERT INTO be_pay_logs 
      (id, server, email, timestamp, method, payload, status, error, level, message, endpoint) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, server, email, timestamp, method, payload,  status, error || "", level || "INFO", message || "", endpoint || ""]
    );

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
      endpoint
    };
  }
}

module.exports = Logs;
