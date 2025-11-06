// Cargamos las variables de entorno PRIMERO
require('dotenv').config();

// Importamos lo que creamos
const app = require('./src/app');
const { testConnection } = require('./src/config/database');

// Puerto donde correrá el servidor
const PORT = process.env.PORT || 3000;

/**
 * Función para iniciar todo
 */
const startServer = async () => {

    // Paso 1: Verificar que MySQL funcione
    console.log('Probando conexión a MySQL...');
    const connected = await testConnection();

    if (!connected) {
        console.error('No se pudo conectar a MySQL. Verifica tu configuración.');
        process.exit(1); // Salir si no hay conexión
    }

    // Paso 2: Iniciar el servidor Express
    app.listen(PORT, () => {
        console.log('');
        console.log('🚀 Servidor iniciado');
        console.log(`🌐 http://localhost:${PORT}`);
        console.log('');
        console.log('Presiona CTRL+C para detener');
    });
};

// Iniciamos todo
startServer();