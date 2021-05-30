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

exports.createTimeline = async (req, res) => {
    const data = req.body;
    const timeline = new Timeline(data);
    timeline.userId = req.user.sub;
    try {
        const newTimeline = await timeline.save();
        return res.json(newTimeline);
    } catch (error) {
        console.log(error)
        return res.status(422).send(error.message);
    }
}

exports.updateTimeline = async (req, res) => {
    const { body, params: { id } } = req;
    try {
        // new: true insures we get the updated value
        const updatedTimeline = await Timeline.findOneAndUpdate({ _id: id }, body, { new: true, runValidators: true });
        return res.json(updatedTimeline);
    } catch (error) {
        console.log(error)
        return res.status(422).send(error.message);
    }
}

exports.deleteTimeline = async (req, res) => {
    const { params: { id } } = req;
    const timeline = await Timeline.findOneAndRemove({ _id: id });
    console.log(timeline);
    return res.json({ _id: timeline._id })
}