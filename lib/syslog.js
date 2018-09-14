const { syslogConfig } = require("./config");
const Log = require("./components/log");
let syslog = null;
module.exports = () => syslog = syslog || new Log(syslogConfig);