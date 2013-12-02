var winston = require('winston');

var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            level: 'debug',
            colorize: true,
            timestamp: true
        })
    ]
});

module.exports = logger;
