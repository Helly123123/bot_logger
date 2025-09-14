const mysql = require("mysql2/promise");
require("dotenv").config();

async function initializeDatabase() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      port: process.env.DB_PORT || 3306,
    });

    console.log("✅ Успешное подключение к MySQL серверу");

    const dbName = connection.escapeId(process.env.DB_NAME || "auth_db");
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    console.log(`🟢 База данных ${dbName} создана или уже существует`);

    await connection.query(`USE ${dbName}`);

    await connection.query(`
  CREATE TABLE IF NOT EXISTS be_pay_logs (
    id VARCHAR(6) UNIQUE,
    email VARCHAR(255),
    method VARCHAR(255),
    payload TEXT,
    \`from\` VARCHAR(255),
    status VARCHAR(255),
    error TEXT
  )
`);

    console.log("🟢 Таблица 'be_pay_logs' создана или уже существует");
  } catch (error) {
    console.error("❌ Ошибка инициализации БД:", error.message);
    throw error;
  } finally {
    if (connection) await connection.end();
  }
}

module.exports = initializeDatabase;
