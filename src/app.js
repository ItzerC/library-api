const express = require('express');
const cors = require('cors');

const app = express();

app.use(express.json());

app.use(cors());

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next(); // IMPORTANTE: continúa al siguiente middleware
});

app.get('/', (req, res) => {
    res.json({
        message: '📚 API de Biblioteca funcionando',
        version: '1.0.0'
    });
});

const bookRoutes = require('./routes/bookRoutes');
const loanRoutes = require('./routes/loanRoutes');
const userRoutes = require('./routes/userRoutes');
app.use('/api/books', bookRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/users', userRoutes);

app.use((req, res) => {
    res.status(404).json({
        error: 'Ruta no encontrada',
        path: req.originalUrl
    });
});

app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({
        error: 'Algo salió mal',
        message: err.message
    });
});

module.exports = app;