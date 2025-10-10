const jwt = require("jsonwebtoken");

/**
 * Асинхронно декодирует JWT токен и возвращает user_id
 * @param {string} token - JWT токен
 * @returns {Promise<{success: boolean, user_id?: string, error?: string}>}
 */
const decodeJwtAndGetUserId = async (token) => {
  return new Promise((resolve) => {
    try {
      if (!token || typeof token !== "string") {
        throw new Error("Токен не предоставлен");
      }

      // Используем decode вместо verify - БЕЗ ПРОВЕРКИ ПОДПИСИ
      const decoded = jwt.decode(token, { complete: true });

      if (!decoded) {
        throw new Error("Неверный фортокена");
      }

      const payload = decoded.payload;

      console.log(payload, "decoded payload");

      if (!payload.user_id) {
        throw new Error("Токен не содержит user_id");
      }

      // Проверяем срок действия (exp) если он есть
      if (payload.exp) {
        const currentTime = Math.floor(Date.now() / 1000);
        if (currentTime > payload.exp) {
          throw new Error("Токен просрочен");
        }
      }

      resolve({
        success: true,
        user_id: payload.user_id,
        email: payload.email,
        brand_slug: payload.brand_slug,
        exp: payload.exp,
      });
    } catch (error) {
      let errorMessage;
      if (error.message === "Токен просрочен") {
        errorMessage = "Токен просрочен";
      } else if (error.message === "Неверный фортокена") {
        errorMessage = "Неверный токен";
      } else {
        errorMessage = error.message;
      }

      resolve({
        success: false,
        error: errorMessage,
      });
    }
  });
};

module.exports = { decodeJwtAndGetUserId };
