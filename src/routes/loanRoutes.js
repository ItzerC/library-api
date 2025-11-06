const express = require('express');
const router = express.Router();

const {
    getAllLoans,
    getLoanById,
    createLoan,
    returnBook
} = require('../controllers/loanController')

router.get('/', getAllLoans);
router.get('/:id', getLoanById);
router.post('/', createLoan);
router.post('/:id/return', returnBook);

module.exports = router;