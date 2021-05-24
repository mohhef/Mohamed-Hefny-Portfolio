const express = require('express');
const server = express();

server.get('/test',(req,res)=>{
    return res.json({message: "Hello world"});
})
const PORT = parseInt(process.env.port)||3001;
server.listen(PORT, (err)=>{
    if(err)console.log(err);
    console.log('Server ready on port:',PORT);
})
