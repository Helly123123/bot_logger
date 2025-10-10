const getTypeLog = (value) => {
  switch (value) {
    case "chatserv.apitter.com":
      return "frontend_vue_dev_logs";
    case "mwi.apitter.com":
      return "frontend_vue_dev_logs";
    case "ctacrew.apitter.com_logs":
      return "frontend_vue_dev_logs";
    case "ctacrew.apitter.com":
      return "frontend_vue_dev_logs";

    case "app.chatserv.ru":
      return "frontend_vue_logs";
    case "app.whatsapi.ru":
      return "frontend_vue_logs";
    case "app2.touch-api.com":
      return "frontend_vue_logs";
  }
};

module.exports = { getTypeLog };
