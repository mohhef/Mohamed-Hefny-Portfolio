const express = require('express');
const server = express();

async function runServer() {
    await require('./db').connect();
    server.use('/api/v1/timeline', require('./routes/timeline'))

    const PORT = parseInt(process.env.port) || 3001;
    server.listen(PORT, (err) => {
        if (err) console.log(err);
        else {
            console.log('Server ready on port:', PORT);
        }
    })
}
runServer();