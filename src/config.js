module.exports = {
    // the port express listens on
    port: 3000,

    // mongodb configuration
    mongodb: {
        host: 'localhost',
        port: 27017
    },

    session: {
        // name of the session cookie
        name: 'express.sid',
        secret: 'asdf1234'
    }
};
