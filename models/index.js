const { Sequelize } = require("sequelize");
const { sequelize } = require("../config/db.config");

// Importar modelos
const User = require("./user.model");
const Image = require("./image.model");

// Inicializar relaciones (si las hay)
// Ejemplo: User.hasMany(Image);

// Sincronizar modelos con la base de datos
(async () => {
  try {
    await sequelize.sync();
    console.log("Modelos sincronizados correctamente");
  } catch (error) {
    console.error("Error al sincronizar modelos:", error);
  }
})();

module.exports = {
  User,
  Image,
  sequelize,
};
