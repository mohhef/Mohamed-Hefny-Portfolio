const config = require('../config/dev')
const mongoose = require('mongoose');

require('./model/portfolio');

exports.connect = () => {
    return mongoose.connect(config.DB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindandModify: false
    }, (err) => {
        if (err) { console.log(err); }
        else {
            console.log('Connected to DB!');
        }
    });
}
