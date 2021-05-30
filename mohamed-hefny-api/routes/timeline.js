const express = require('express');
const router = express.Router();
const {checkJwt} = require('../controllers/auth')
const { getTimeline,
    getTimelineById,
    createTimeline,
    updateTimeline} = require('../controllers/timeline')

router.get('',getTimeline);
router.get('/:id', getTimelineById);
router.post('', checkJwt, createTimeline)
router.patch('/:id', checkJwt, updateTimeline)
module.exports = router;