const express = require('express');
const router = express.Router();
const {getTimeline} = require('../controllers/timeline')
const {getTimelineById} = require('../controllers/timeline');

router.get('',getTimeline);
router.get('/:id', getTimelineById);
module.exports = router;