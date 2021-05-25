const {timeline} = require('./data') 
const Timeline =  require('../db/model/timeline')

class FakeDB {

    async clean() {
        await Timeline.deleteMany({});
    }

    async addData() {
        await Timeline.create(timeline)
    }

    async populate() {
        await this.clean();
        await this.addData();
    }
}

//exports an instance of FakeDB, so I can call the functions directly
module.exports = new FakeDB();

