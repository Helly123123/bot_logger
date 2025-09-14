module.exports = async (req, res, next) => {
  try {
    const { method, payload, from, status, error } = req.body;

    if (!method) {
      return res.status(404).json({
        success: false,
        message: "method is required",
      });
    } else if (!payload) {
      return res.status(404).json({
        success: false,
        message: "payload is required",
      });
    } else if (!status) {
      return res.status(404).json({
        success: false,
        message: "status is required",
      });
    } else if (status === "error" && !error) {
      return res.status(404).json({
        success: false,
        message: "error is required",
      });
    } else {
      next();
    }
  } catch (error) {
    console.error("Ошибка регистрации:", error);
    res.status(401).json({
      message: "Ошибка при регистрации пользователя",
    });
  }
};
