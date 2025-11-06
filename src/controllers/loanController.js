const {pool} = require('../config/database');

const getAllLoans = async (req, res) => {
    try {
        const {status, user_id} = req.query;

        let query = `
            SELECT l.*,
                   u.full_name as user_name,
                   u.email     as user_email,
                   b.title     as book_title,
                   b.author    as book_author
            FROM loans l
                     JOIN USERS u ON l.user_id = u.id
                     JOIN books b ON l.book_id = b.id
            WHERE 1 = 1
        `;

        const params = [];

        if (status) {
            query += ' AND l.status = ?';
            params.push(status);
        }

        if (user_id) {
            query += ' AND l.user_id = u.id';
            params.push(user_id);
        }

        query += ' ORDER BY l.loan_date DESC';

        const [rows] = await pool.query(query, params);

        res.json({
            success: true,
            count: rows.length,
            filters: {status, user_id},
            data: rows
        });
    } catch (error) {
        console.error('Error en getAllLoans:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los préstamos',
            error: error.message
        });
    }
};

const getLoanById = async (req, res) => {
    try {
        const {id} = req.params;

        const [rows] = await pool.query(`
                    SELECT l.*,
                           u.full_name as user_name,
                           u.email     as user_email,
                           u.phone     as user_phone,
                           b.title     as book_title,
                           b.author    as book_author,
                           b.isbn      as book_isbn
                    FROM loans l
                             JOIN users u ON l.user_id = u.id
                             JOIN books b ON l.book_id = b.id
                    WHERE l.id = ?
            `, [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No se encontró el préstamo con ID ${id}`
            });
        }

        const [history] = await pool.query(`
            SELECT *
            FROM loan_history
            WHERE loan_id = ?
            ORDER BY action_date DESC
        `, [id]);

        res.json({
            success: true,
            data: {
                loan: rows[0],
                history: history
            }
        });
    } catch (error) {
        console.error('Error en getLoanById:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el préstamo',
            error: error.message
        })
    }
};

const createLoan = async (req, res) => {
    try {
        const {user_id, book_id, loan_days} = req.body;

        if (!user_id || !book_id) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos requeridos: id de usuario y id de libro'
            });
        }

        const days = loan_days || 14;

        if (days < 1 || days > 30) {
            return res.status(400).json({
                success: false,
                message: 'El periodo del préstamo debe ser entre 1 y 30 días'
            });
        }

        const [result] = await pool.query(
            'CALL sp_create_loan(?, ?, ?)',
            [user_id, book_id, loan_days]
        );

        const loanData = result[0][0];

        const [loan] = await pool.query(`
            SELECT l.*, u.full_name as user_name, b.title as book_title, b.author as book_author
            FROM loans l
                     JOIN users u ON l.user_id = u.id
                     JOIN books b ON l.book_id = b.id
            WHERE l.id = ?
        `, [loanData.loan_id]);

        res.status(201).json({
            success: true,
            message: 'Préstamo creado exitosamente',
            data: loan[0]
        });
    } catch (error) {
        console.error('Error en createLoan:', error);

        if (error.code === 'ER_SIGNAL_EXCEPTION') {
            return res.status(400).json({
                success: false,
                message: error.sqlMessage || 'No se pudo crear el préstamo'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error al crear el préstamo',
            error: error.message
        })
    }
};

const returnBook = async (req, res) => {
    try {
        const {id} = req.params;

        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'El ID de préstamo debe ser un número válido'
            });
        }

        const [result] = await pool.query('CALL sp_return_book(?)', [id]);

        const returnData = result[0][0];

        const [loan] = await pool.query(`
            SELECT l.*, u.full_name as user_name, u.email as user_email, b.title as book_title, b.author as book_author
            FROM loans l
                     JOIN users u ON l.user_id = u.id
                     JOIN books b ON l.book_id = b.id
            WHERE l.id = ?
        `, [id]);

        let message = 'Libro devuelto exitosamente';
        if (returnData.days_late > 0) {
            const fineAmount = parseFloat(returnData.fine_amount);
            message = `. Se aplicó una multa de S/.${fineAmount.toFixed(2)} por ${returnData.days_late} día(s) de retraso`;
        }

        res.json({
            success: true,
            message: message,
            data: {
                loan: loan[0],
                return_info: returnData
            }
        });
    } catch (error) {
        console.error('Error en returnBook:', error);

        if (error.code === 'ER_SIGNAL_EXCEPTION') {
            return res.status(400).json({
                success: false,
                message: error.sqlMessage || 'No se pudo procesar la devolución'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error al devolver el libro',
            error: error.message
        });
    }
};

module.exports = {
    getAllLoans,
    getLoanById,
    createLoan,
    returnBook
}