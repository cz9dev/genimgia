
[![License: Apache 2.0](https://img.shields.io/badge/license-Apache%20License%202.0-blue)](https://opensource.org/license/apache-2-0).

# 🚀 Genimg IA
Generador de Imágenes con IA + LDAP

## APIs Soportadas
[Avangenio de plataformia](https://plataformia.com/)

## Pre-requisitos si decea desplegar en producción
Si usted deceas desplegar Genimg IA en un ambiente de producción, leer [Despliegue de apps Node.js en producción](https://cz9dev.github.io/16-06-2025-desplegar-aplicacion-nodejs-en-produccion/)

## Requisitos
- Node.js 18+
- SQLite/MariaDB
- Credenciales LDAP/AD

## Instalación
```bash
git clone https://github.com/cz9dev/genimgia.git
cd genimgia
```

## Configuración inicial
1. Copia el archivo de ejemplo:
```bash
   cp .env.example .env
```
2. Completa los valores en .env con tus credenciales reales
3. Instala dependencias:
```bash
npm install
```
4. Inicia la aplicación:
```bash
npm start
```

## Licencia
[Apache 2.0](LICENSE)