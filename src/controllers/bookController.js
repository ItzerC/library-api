const {pool} = require('../config/database');

const getAllBooks = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM books');

        res.json({
            success: true,
            count: rows.length,
            data: rows
        });
    } catch (error) {
        console.error('Error en getAllBooks:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los libros',
            error: error.message
        });
    }
};

const getBookById = async (req, res) => {
    try {
        const {id} = req.params;

        const [rows] = await pool.query(
            'SELECT * FROM books WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No se encontró el libro con ID ${id}`
            });
        }

        res.json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        console.error('Error en getBookById:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el Libro',
            error: error.message
        });
    }
};

const createBook = async (req, res) => {
    try {
        const {title, author, isbn, category, total_copies, publication_year} = req.body;

        if (!title || !author || !isbn) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos requeridos: título, autor o isbn'
            });
        }

        const [result] = await pool.query(
            `INSERT INTO books (title, author, isbn, category, total_copies, available_copies, publication_year)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [title, author, isbn, category || null, total_copies || 1, total_copies || 1, publication_year || null]
        );

        res.status(201).json({
            success: true,
            message: 'Libro creado exitosamente',
            data: {
                id: result.insertId,
                title,
                author,
                isbn
            }
        });
    } catch (error) {
        console.error('Error en createBook:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'El ISBN ya existe',
            })
        }

        res.status(500).json({
            success: false,
            message: 'Error al crear el libro',
            error: error.message
        });
    }
};

const searchBooks = async (req, res) => {
    try {
        const {search} = req.body;

        if (!search) {
            return res.status(400).json({
                success: false,
                message: 'Debes proporcionar un término de búsqueda'
            });
        }

        const searchTerm = `%${search}%`;
        const [rows] = await pool.query(
            `SELECT *
             FROM books
             WHERE title LIKE ?
                OR author LIKE ?`, [searchTerm, searchTerm]
        );

        res.json({
            success: true,
            count: rows.length,
            search: search,
            data: rows
        });
    } catch (error) {
        console.error('Error en searchBooks:', error);
        res.status(500).json({
            success: false,
            message: 'Error al buscar libros',
            error: error.message
        });
    }
};

const updateBook = async (req, res) => {
    try {
        const {id} = req.params;
        const {title, author, isbn, category, total_copies, available_copies, publication_year} = req.body;

        const [existing] = await pool.query(
            'SELECT * FROM books WHERE id = ?', [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No se encontró el libro con ID ${id}`
            });
        }

        if (available_copies > total_copies) {
            return res.status(400).json({
                success: false,
                message: 'Las copias disponibles no pueden ser mayor que las totales'
            });
        }

        const updates = [];
        const values = [];

        if (title !== undefined) {
            updates.push('title = ?');
            values.push(title);
        }
        if (author !== undefined) {
            updates.push('author = ?');
            values.push(author);
        }
        if (isbn !== undefined) {
            updates.push('isbn = ?');
            values.push(isbn);
        }
        if (category !== undefined) {
            updates.push('category = ?');
            values.push(category);
        }
        if (total_copies !== undefined) {
            updates.push('total_copies = ?');
            values.push(total_copies);
        }
        if (available_copies !== undefined) {
            updates.push('available_copies = ?');
            values.push(available_copies);
        }
        if (publication_year !== undefined) {
            updates.push('publication_year = ?');
            values.push(publication_year);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No se proporcionaron campos para actualizar'
            });
        }

        values.push(id);

        const query = `UPDATE books
                       SET ${updates.join(', ')}
                       WHERE id = ?`;
        await pool.query(query, values);

        const [updated] = await pool.query(
            'SELECT * FROM books WHERE id = ?', [id]
        );

        res.json({
            success: true,
            message: 'Libro actualizado exitosamente',
            data: updated[0]
        });
    } catch (error) {
        console.error('Error en updateBook:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'El ISBN ya existe'
            })
        }

        res.status(500).json({
            success: false,
            message: 'Error al actualizar el libro',
            error: error.message
        });
    }
};

module.exports = {
    getAllBooks,
    getBookById,
    createBook,
    searchBooks,
    updateBook
}