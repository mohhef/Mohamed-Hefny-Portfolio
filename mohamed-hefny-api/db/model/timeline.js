const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const timelineSchema = new Schema({
    title: {type: String, required: true},
    company: {type: String},
    website: {type: String},
    location: {type: String},
    jobTitle: {type: String},
    description: {type: String},
    buttonText: {type: String},
    type: {type: String},
    startDate:{type: Date},
    endDate: {type: Date},
    userId: {type: String, required: true},
    createdAt: {type: Date, default: Date.now}
})

module.exports = mongoose.model('Timeline', timelineSchema);