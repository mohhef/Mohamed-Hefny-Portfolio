const express = require('express');
const router = express.Router();
const { checkJwt, checkRole } = require('../controllers/auth')
const { getTimeline,
    getTimelineById,
    createTimeline,
    updateTimeline,
    deleteTimeline } = require('../controllers/timeline')


router.get('', getTimeline);
router.get('/:id', getTimelineById);
router.post('', checkJwt, checkRole('admin'), createTimeline)
router.patch('/:id', checkJwt, checkRole('admin'), updateTimeline)
router.delete('/:id', checkJwt, checkRole('admin'), deleteTimeline)
module.exports = router;