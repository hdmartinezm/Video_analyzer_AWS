const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes');

const app = express();
const BASE = '/analisis-videos';

// Middleware
app.use(cors());
app.use(express.json());

// Health check para App Runner
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Redirigir raíz al path de producción
app.get('/', (req, res) => res.redirect(BASE + '/'));

// Servir el frontend estático bajo el prefijo de producción
app.use(BASE, express.static(path.join(__dirname, '../..')));

// Rutas de la API bajo el mismo prefijo
app.use(BASE, apiRoutes);

module.exports = app;
