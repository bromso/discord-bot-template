import type en from "./en.js";

const dict: typeof en = {
  ping: { reply: "Pong! ({latency}ms)" },
  settings: {
    title: "Inställningar",
    localeChanged: "Språket har ändrats till {locale}.",
    welcomeUpdated: "Välkomstmeddelandet har uppdaterats.",
    noPermission: "Du behöver behörigheten Hantera server.",
  },
  errors: { unknown: "Något gick fel. Felet har loggats." },
};
export default dict;
