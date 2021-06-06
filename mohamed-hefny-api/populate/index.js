const config = require('../config')
const mongoose = require('mongoose');
const fakeDb = require('./FakeDB');

mongoose.connect(config.DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
}, async (err) => {
    if (err) { console.log(err); }
    else {
        console.log('> Starting populating DB')
        await fakeDb.populate();
        await mongoose.connection.close();
        console.log('> Db has been populated...!');
    }
})
