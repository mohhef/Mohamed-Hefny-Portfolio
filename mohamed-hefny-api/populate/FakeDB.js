const {portfolio} = require('./data') 
const Portfolio =  require('../db/model/portfolio')

class FakeDB {

    async clean() {
        await Portfolio.deleteMany({});
    }

    async addData() {
        await Portfolio.create(portfolio)
    }

    async populate() {
        await this.clean();
        await this.addData();
    }
}

//exports an instance of FakeDB, so I can call the functions directly
module.exports = new FakeDB();

