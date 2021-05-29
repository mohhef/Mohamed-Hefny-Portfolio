const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');

// Autentication middleware
// This middleware will cehck authentication access token 
//in authorization headers of a request
// It will verify access token against auth0 JSON web key set
exports.checkJwt = jwt({
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri:''
    }),
    audience:'',
    issuer:'',
    algorithms: ['RS256']
})