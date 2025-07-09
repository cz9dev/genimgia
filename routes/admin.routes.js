const express = require("express");
const router = express.Router();
const {
  ensureAuthenticated,
  ensureAdmin,
} = require("../middleware/auth.middleware");
const aiConfig = require("../config/ai.config");

// Configuración de la API de IA
router.get("/settings", ensureAuthenticated, ensureAdmin, (req, res) => {
  const currentConfig = aiConfig.getConfig();
  res.render("admin/settings", {
    title: "Configuración del sistema",
    config: currentConfig,
  });
});

router.post("/settings/ai", ensureAuthenticated, ensureAdmin, (req, res) => {
  const { apiKey, baseURL, model, size, quality } = req.body;

  try {
    const updatedConfig = aiConfig.updateConfig({
      apiKey,
      baseURL,
      model,
      size,
      quality,
    });

    req.flash("success_msg", "Configuración actualizada correctamente");
    res.redirect("/admin/settings");
  } catch (error) {
    console.error("Error updating AI config:", error);
    req.flash("error_msg", "Error al actualizar la configuración");
    res.redirect("/admin/settings");
  }
});

module.exports = router;
