const express = require('express');
const router = express.Router();

const {
    getAllBooks,
    getBookById,
    createBook,
    searchBooks,
    updateBook
} = require('../controllers/bookController');

router.get('/', getAllBooks);
router.get('/:id', getBookById);
router.post('/', createBook);
router.post('/search', searchBooks);
router.put('/:id', updateBook);

module.exports = router;