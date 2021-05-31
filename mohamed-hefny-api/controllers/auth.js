const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const config = require('../config/dev')
// Autentication middleware
// This middleware will cehck authentication access token 
//in authorization headers of a request
// It will verify access token against auth0 JSON web key set
exports.checkJwt = jwt({
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri:'https://mohhef.us.auth0.com/.well-known/jwks.json'
    }),
    audience:'https://mohhef.us.auth0.com/api/v2/',
    issuer:'https://mohhef.us.auth0.com/',
    algorithms: ['RS256']
})

exports.checkRole = (role)=>{
    return (req,res,next)=>{
        const user = req.user;
        if(user && user[config.AUTH0_NAMESPACE + '/roles'].includes(role)){
            next();
        }
        else{
            return res.status(401).send("You are not authorized1")
        }
    }

}
