const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/auth.middleware");
const imageController = require("../controllers/image.controller");

router.get("/", ensureAuthenticated, (req, res) => {
  res.render("generator", { title: "Generador de Imágenes" });
});

router.post("/generate", ensureAuthenticated, imageController.generateImage);
router.get("/images", ensureAuthenticated, imageController.getUserImages);

router.delete("/:id", ensureAuthenticated, imageController.deleteImage);
router.post("/:id/share", ensureAuthenticated, imageController.shareImage);
router.get("/shared/:token", imageController.viewSharedImage);
//router.get("/shared/:token", ensureAuthenticated, imageController.viewSharedImage);

module.exports = router;
