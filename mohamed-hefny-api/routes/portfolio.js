const express = require('express');
const router = express.Router();
const {getPortfolios} = require('../controllers/portfolio')

router.get('',getPortfolios)
module.exports = router;