const LdapStrategy = require("passport-ldapauth");
const ldapOptions = {
  server: {
    url: process.env.LDAP_URL || "ldap://your-ldap-server:389",
    bindDN: process.env.LDAP_BIND_DN || "cn=admin,dc=example,dc=com",
    bindCredentials: process.env.LDAP_BIND_CREDENTIALS || "password",
    searchBase: process.env.LDAP_SEARCH_BASE || "ou=users,dc=example,dc=com",
    //searchFilter: process.env.LDAP_SEARCH_FILTER || "(uid={{username}})", // Para Ldap
    //searchAttributes: ["uid", "displayName", "mail"],    // Para Ldap
    searchFilter: "(sAMAccountName={{username}})", //Para AD
    searchAttributes: ["displayName", "mail", "sAMAccountName"], // Para AD
    //usernameField: "username",
    //passwordField: "password",    
  },
};

module.exports = new LdapStrategy(ldapOptions, (user, done) => {
  // Aquí puedes agregar lógica adicional para manejar el usuario
  if (!user) return done(null, false);
  return done(null, {
    uid: user.sAMAccountName,
    displayName: user.displayName || user.sAMAccountName,
    mail: user.mail || `${user.sAMAccountName}@dominio.com`,
  });
});