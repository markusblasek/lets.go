module.exports = {
  // the port express listens on
  port: 3000,

  // public address to access the server from the outside
  address: 'http://localhost:3000',

  // mongodb configuration
  mongodb: {
    host: 'localhost',
    port: 27017
  },

  // session related information
  session: {
    // name of the session cookie
    name: 'express.sid',
    // the key used to encrypt the cookie
    secret: 'asdf1234'
  }
};
