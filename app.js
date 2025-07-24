require('dotenv').config();
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const http = require("http");
const https = require("https");
const fs = require("fs");
const ldapStrategy = require('./config/ldap.config');
const { sequelize } = require('./config/db.config');
const aiConfig = require('./config/ai.config');
const { User } = require('./models');

const app = express();

// Middleware
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use("/images", express.static(path.join(__dirname, "public/images")));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    },
  })
);

// Passport and LDAP
app.use(passport.initialize());
app.use(passport.session());
passport.use(ldapStrategy);

passport.serializeUser((user, done) => {
  done(null, user.uid);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Flash messages
app.use(flash());

// View engine setup
app.use(expressLayouts);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('layout', 'layouts/main');

// Global variables
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg')[0];
  res.locals.error_msg = req.flash('error_msg')[0];
  res.locals.error = req.flash('error')[0];
  res.locals.user = req.user || null;
  res.locals.aiConfig = aiConfig.getConfig();
  next();
});

// Database connection
sequelize.sync()
  .then(() => console.log('Database connected'))
  .catch(err => console.error('Database connection error:', err));

// Rutas
app.use('/', require('./routes/index.routes'));  // Nueva ruta para el root
app.use('/auth', require('./routes/auth.routes'));  // Cambiamos a /auth para las rutas de autenticación
app.use('/generator', require('./routes/generator.routes'));
app.use('/admin', require('./routes/admin.routes'));

// Error 404 - Página no encontrada
app.use((req, res, next) => {
  res.status(404).render('404', { 
    title: 'Página no encontrada',
    layout: 'layouts/main'  // Asegúrate de usar el layout
  });
});

// Error 500 - Error del servidor
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('500', { 
    title: 'Error del servidor',
    error: err,  // Pasar el error a la vista
    layout: 'layouts/main'  // Asegúrate de usar el layout
  });
});

const PORT = process.env.PORT || 3000;

// Configuración de servidor seguro
const startServer = () => {
  // 1. Configuración para producción (HTTPS obligatorio)
  if (process.env.NODE_ENV === 'production') {
    try {      
      https.createServer(app).listen(PORT, () => {
        console.log(`Servidor PRODUCCIÓN HTTPS en puerto ${PORT}`);
      });
      
    } catch (err) {      
      console.error('El servidor no puede iniciar sin HTTPS en producción');
      process.exit(1); // Falla grave en producción
    }
  }
  // 2. Configuración para desarrollo (HTTPS opcional)
  else {
    try {
      const httpsOptions = {
        key: fs.readFileSync(path.join(__dirname, 'ssl/private-key.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'ssl/certificate.pem'))
      };
      
      https.createServer(httpsOptions, app).listen(PORT, () => {
        console.log(`Servidor DESARROLLO HTTPS en https://localhost:${PORT}`);
      });
      
      // Opcional: Redirigir HTTP a HTTPS en desarrollo
      http.createServer((req, res) => {
        res.writeHead(301, { 'Location': `https://localhost:${PORT}${req.url}` });
        res.end();
      }).listen(3001);
      
    } catch (err) {
      console.log('No se encontraron certificados SSL, usando HTTP en desarrollo');
      http.createServer(app).listen(PORT, () => {
        console.log(`Servidor DESARROLLO HTTP en http://localhost:${PORT}`);
      });
    }
  }
};

startServer();