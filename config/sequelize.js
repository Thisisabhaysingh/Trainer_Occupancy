require('dotenv').config();
const { Sequelize } = require("sequelize");

// MySQL configuration only
const sequelize = new Sequelize(
  process.env.DB_NAME || "mis_database",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    dialect: "mysql",
    logging: false,
    define: {
      freezeTableName: false,
      underscored: false,
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

module.exports = sequelize;




