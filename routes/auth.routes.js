const express = require("express");
const router = express.Router();
const passport = require("passport");
const { User } = require("../models");

// Ruta de login
router.get('/login', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/generator');
  }
  res.render('auth/login', { title: 'Iniciar sesión' });
});

// Procesar login
router.post("/login", (req, res, next) => {
  passport.authenticate("ldapauth", (err, user, info) => {
    if (err) {
      req.flash("error_msg", "Error en el servidor");
      return next(err);
    }
    if (!user) {
      req.flash("error_msg", info.message || "Credenciales incorrectas");
      return res.redirect("login");
    }
    req.logIn(user, async (err) => {
      if (err) {
        req.flash("error_msg", "Error al iniciar sesión");
        return next(err);
      }

      // Guardar o actualizar usuario en la base de datos
      try {
        const [dbUser] = await User.findOrCreate({
          where: { uid: user.uid },
          defaults: {
            displayName: user.displayName || user.uid,
            email: user.mail || `${user.uid}@yourdomain.com`,
            isAdmin: user.isAdmin || false,
          },
        });

        // Actualizar datos si es necesario
        if (
          dbUser.displayName !== user.displayName ||
          dbUser.email !== user.mail
        ) {
          await dbUser.update({
            displayName: user.displayName || dbUser.displayName,
            email: user.mail || dbUser.email,
          });
        }

        return res.redirect("/generator");
      } catch (dbError) {
        console.error("Database error:", dbError);
        req.flash("error_msg", "Error al registrar usuario");
        return res.redirect("login");
      }
    });
  })(req, res, next);
});

// Ruta de logout
router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
      return next(err);
    }
    req.flash("success_msg", "Has cerrado sesión correctamente");
    res.redirect("login");
  });
});

// Ruta de configuración (solo para administradores)
router.get("/settings", (req, res) => {
  if (!req.user || !req.user.isAdmin) {
    req.flash("error_msg", "No tienes permisos para acceder a esta página");
    return res.redirect("/");
  }
  res.render("settings", { title: "Configuración" });
});

module.exports = router;
