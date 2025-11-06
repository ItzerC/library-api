const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,         // localhost
    user: process.env.DB_USER,         // root
    password: process.env.DB_PASSWORD, // tu password
    database: process.env.DB_NAME,     // library_db
    waitForConnections: true,          // Espera si todas están ocupadas
    connectionLimit: 10                // Máximo 10 conexiones al mismo tiempo
});

const testConnection = async () => {
    try {
        const [rows] = await pool.query('SELECT 1 + 1 AS result');
        console.log('✅ Conexión exitosa a MySQL');
        console.log(`📊 Base de datos: ${process.env.DB_NAME}`);
        return true;
    } catch (error) {
        console.error('❌ Error conectando a MySQL:', error.message);
        return false;
    }
};

module.exports = {
    pool,
    testConnection
};
