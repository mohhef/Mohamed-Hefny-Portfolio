const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const portfolioSchema = new Schema({
    title: {type: String, required: true},
    company: {type: String},
    companyWbsite: {type: String},
    location: {type: String},
    jobTitle: {type: String},
    description: {type: String},
    startDate:{type: Date},
    endDate: {type: Date}
})

module.exports = mongoose.model('Portfolio', portfolioSchema);