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

exports.createTimeline = async (req,res)=>{
    const data = req.body;
    const timeline = new Timeline(data);
    // TODO: Extract from request!
    const userId = 'google-oauth2|106772989277922933463';
    portfolio.userId = userId
    try{
        const newTimeline = await timeline.save();
        return res.json(newTimeline);
    }catch{
        return res.status(422).send(error.message);
    }
}