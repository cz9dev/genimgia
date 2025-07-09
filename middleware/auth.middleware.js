exports.ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash("error_msg", "Por favor inicia sesión para acceder a esta página");
  res.redirect("/login");
};

exports.ensureAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.isAdmin) {
    return next();
  }
  req.flash("error_msg", "No tienes permisos para acceder a esta página");
  res.redirect("/");
};
