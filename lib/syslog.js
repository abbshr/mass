const { syslogConfig } = require("./config");
const Log = require("./components/log");

module.exports = Log(syslogConfig);