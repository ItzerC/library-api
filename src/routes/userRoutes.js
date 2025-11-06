const express = require('express');
const router = express.Router();

const {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deactivateUser
} = require('../controllers/userController');

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id/deactivate', deactivateUser);

module.exports = router;