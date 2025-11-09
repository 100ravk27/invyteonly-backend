const MySQLStore = require('express-mysql-session')(require('express-session'));
require('dotenv').config();

const options = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
};

const sessionStore = new MySQLStore(options);

module.exports = sessionStore;
