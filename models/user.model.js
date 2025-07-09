const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db.config");

const User = sequelize.define(
  "User",
  {
    uid: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    displayName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    isAdmin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = User;
