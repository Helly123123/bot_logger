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
    const { email, method, payload, from, status, error } = userData;

    function generateSixDigitId() {
      return Math.floor(100000 + Math.random() * 900000);
    }

    const id = generateSixDigitId();

    const [result] = await pool.query(
      `INSERT INTO be_pay_logs 
      (id, email, method, payload, \`from\`, status, error) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, email, method, payload, from, status, error || ""]
    );

    console.log(result);
    return {
      id,
      email,
      method,
      payload,
      from,
      status,
      error,
    };
  }
}

module.exports = Logs;
