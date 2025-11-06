const {pool} = require('../config/database');

const getAllUsers = async (req, res) => {
    try {
        const {active} = req.query;

        let query = 'SELECT * FROM users';
        let params = [];

        if (active !== undefined) {
            query += ` WHERE is_active = ?`;
            params.push(active === 'true' ? 1 : 0);
        }

        const [rows] = await pool.query(query, params);

        res.json({
            success: true,
            count: rows.length,
            data: rows
        });
    } catch (error) {
        console.error('Error en getAllUsers:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los usuarios',
            error: error.message
        });
    }
};

const getUserById = async (req, res) => {
    try {
        const {id} = req.params;

        const [rows] = await pool.query(
            'SELECT * FROM users WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No se encontró el usuario con ID ${id}`
            });
        }

        const [loans] = await pool.query(
            `SELECT l.*, b.title as book_title
             FROM loans l
                      JOIN books b ON l.book_id = b.id
             WHERE l.user_id = ?
               AND l.status = 'active'`, [id]
        );

        res.json({
            success: true,
            data: {
                user: rows[0],
                active_loans: loans
            }
        });
    } catch (error) {
        console.error('Error en getUserById:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el usuario',
            error: error.message
        });
    }
};

const createUser = async (req, res) => {
    try {
        const {full_name, email, phone, address} = req.body;

        if (!full_name || !email || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos requeridos: nombre completo, email o celular'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'El email no tiene un formato válido'
            });
        }

        const [result] = await pool.query(
            `INSERT INTO users (full_name, email, phone, address, registration_date, is_active)
             VALUES (?, ?, ?, ?, CURDATE(), TRUE)`,
            [full_name, email, phone, address || null]
        );

        res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente',
            data: {
                id: result.insertId,
                full_name,
                email,
                phone
            }
        });
    } catch (error) {
        console.error('Error en createUser:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'El email ya esta registrado en otro usuario',
            })
        }

        res.status(500).json({
            success: false,
            message: 'Error al crear el usuario',
            error: error.message
        });
    }
};

const updateUser = async (req, res) => {
    try {
        const {id} = req.params;
        const {full_name, email, phone, address} = req.body;

        const [existing] = await pool.query(
            'SELECT * FROM users WHERE id = ?', [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No se encontró el usuario con ID ${id}`
            });
        }

        const updates = [];
        const values = [];

        if (full_name !== undefined) {
            updates.push('full_name = ?');
            values.push(full_name);
        }
        if (email !== undefined) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'El email no tiene un formato válido'
                });
            }
            updates.push('email = ?');
            values.push(email);
        }
        if (address !== undefined) {
            updates.push('address = ?');
            values.push(address);
        }
        if (phone !== undefined) {
            updates.push('phone = ?');
            values.push(phone);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No se proporcionaron campos para actualizar'
            });
        }

        values.push(id);

        const query = `UPDATE users
                       SET ${updates.join(', ')}
                       WHERE id = ?`;
        await pool.query(query, values);

        const [updated] = await pool.query(
            'SELECT * FROM users WHERE id = ?', [id]
        );

        res.json({
            success: true,
            message: 'Usuario actualizado exitosamente',
            data: updated[0]
        });
    } catch (error) {
        console.error('Error en updateUser:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'El email ya esta registrado en otro usuario'
            })
        }

        res.status(500).json({
            success: false,
            message: 'Error al actualizar el usuario',
            error: error.message
        });
    }
};

const deactivateUser = async (req, res) => {
    try {
        const {id} = req.params;

        const [users] = await pool.query(
            `SELECT *
             FROM users
             WHERE id = ?`, [id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No se encontro el usuario con ID ${id}`
            });
        }

        const [loans] = await pool.query(
            `SELECT COUNT(*) as count
             FROM loans
             WHERE user_id = ?
               AND status = 'active'`, [id]
        );

        if (loans[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'No se puede eliminar un usuario con préstamos activos',
                active_loans: loans[0].count
            });
        }

        await pool.query(
            'UPDATE users SET is_active = FALSE where id = ?', [id]
        );

        res.json({
            success: true,
            message: 'Usuario desactivado correctamente'
        })

    } catch (error) {
        console.error('Error en deactivateUser:', error);
        res.status(500).json({
            success: false,
            message: 'Error al desactivar el usuario',
            error: error.message
        })
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deactivateUser
}