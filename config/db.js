const mysql = require("mysql2/promise");
require("dotenv").config();

// Убедитесь, что DB_NAME есть в .env
const DB_NAME = process.env.DB_NAME || "auth_db"; // Добавлено значение по умолчанию

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "", // Добавлено значение по умолчанию
  database: DB_NAME, // Используем переменную с проверкой
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Проверка подключения с явным указанием базы
async function testConnection() {
  let connection;
  try {
    connection = await pool.getConnection();

    // Явно выбираем базу данных
    await connection.query(`USE ${DB_NAME}`);

    console.log(`✅ Успешное подключение к базе ${DB_NAME}`);

    // Проверяем существование таблицы
    const [tables] = await connection.query("SHOW TABLES LIKE 'be_pay_logs'");
    if (tables.length === 0) {
      console.warn("⚠️ Таблица be_pay_logs не найдена!");
    }
  } catch (error) {
    console.error("❌ Ошибка подключения:", error.message);

    // Если ошибка связана с базой данных, пытаемся создать её
    if (error.code === "ER_BAD_DB_ERROR") {
      console.log("🔄 Пытаюсь создать базу данных...");
      try {
        const adminConn = await mysql.createConnection({
          host: process.env.DB_HOST,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
        });

        await adminConn.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`);
        console.log(`🟢 База данных ${DB_NAME} создана`);
        await adminConn.end();
      } catch (createError) {
        console.error("❌ Не удалось создать базу:", createError.message);
      }
    }

    throw error;
  } finally {
    if (connection) connection.release();
  }
}

// Вызываем проверку при старте
testConnection();

module.exports = pool;
