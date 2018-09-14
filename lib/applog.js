const { applogConfig } = require("./config");
const Log = require("./components/log");
let applog = null;
module.exports = () => applog = applog || new Log(applogConfig);