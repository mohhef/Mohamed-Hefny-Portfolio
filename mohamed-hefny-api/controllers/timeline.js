const mongoose = require('mongoose');
const Timeline = mongoose.model('Timeline')

exports.getTimeline = async (req, res) => {
    const timeline = await Timeline.find({});
    return res.json(timeline);
}

exports.getTimelineById = async (req, res) => {
    try {
        const timeline = await Timeline.findById(req.params.id);
        return res.json(timeline)
    } catch (error) {
        return res.status(422).send(error.message);
    }
}