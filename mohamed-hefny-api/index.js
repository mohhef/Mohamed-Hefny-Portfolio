const express = require('express');
const server = express();

async function runServer() {
    await require('./db').connect();
    server.use(express.json());
    server.use('/api/v1/timeline', require('./routes/timeline'))

    server.get('', (req,res)=>{
        res.sendFile('index.html',{root: __dirname})
    })

    const PORT = parseInt(process.env.PORT) || 3001;
    server.listen(PORT, (err) => {
        if (err) console.log(err);
        else {
            console.log('Server ready on port:', PORT);
        }
    })
}
runServer();