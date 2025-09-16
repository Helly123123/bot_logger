const app = require("./app");
const initAuthDatabase = require("./database/initDatabase");
require("dotenv").config();

// require("./bots/bot");

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await initAuthDatabase();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Database initialized successfully`);
      console.log(`Telegram bot initialized`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
