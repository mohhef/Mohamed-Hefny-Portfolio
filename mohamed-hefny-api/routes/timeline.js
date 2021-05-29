const express = require('express');
const router = express.Router();
const {checkJwt} = require('../controllers/auth')
const { getTimeline,
    getTimelineById,
    createTimeline } = require('../controllers/timeline')

router.get('',getTimeline);
router.get('/:id', getTimelineById);
router.post('', checkJwt, createTimeline)
module.exports = router;