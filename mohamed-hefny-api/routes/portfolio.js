const express = require('express');
const router = express.Router();
const {getPortfolios} = require('../controllers/portfolio')
const {getPortfolioById} = require('../controllers/portfolio');

router.get('',getPortfolios);
router.get('/:id', getPortfolioById);
module.exports = router;