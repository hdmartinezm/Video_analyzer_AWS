require('dotenv').config(); // Carga las variables de entorno desde .env

const app = require('./src/app');
const port = process.env.PORT || 3000;

app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor backend escuchando en http://0.0.0.0:${port}`);
});
