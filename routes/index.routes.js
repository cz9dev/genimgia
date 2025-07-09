const express = require("express");
const router = express.Router();

// Ruta principal
router.get("/", (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect("/generator");
  }
  res.redirect("/auth/login");
});

module.exports = router;
