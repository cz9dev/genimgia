const { Sequelize } = require("sequelize");

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: process.env.DB_PATH || "./database.sqlite",
  logging: process.env.NODE_ENV === "development" ? console.log : false,
});

// Test the connection
(async () => {
  try {
    await sequelize.authenticate();
    console.log("Connection to SQLite has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
})();

module.exports = { sequelize };
