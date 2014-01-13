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
    secret: '5b26243c6e69b09810268009f094c536590bf3c63f2f69bed47acd68178be2b0'
  },

  // oauth
  facebook: {
    id: '723348891027933',
    secret: 'b82698180e06348651c4cf1a8285f54b'
  },
  google: {
    id: '179733906984-b3cg0psdbp97ou2th4689o7ia4qt34lg.apps.googleusercontent.com',
    secret: 'S8IkqL0X3uWnSFOMxFQw2VMe'
  }
};
