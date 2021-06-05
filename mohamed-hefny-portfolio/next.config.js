const path = require('path');
module.exports = {
    webpack: config => {
        config.module.rules.push({
            test: /\.svg$/,
            use: ["@svgr/webpack"]
        })
        return config;
    },
    env: {
        AUTH0_NAMESPACE: process.env.AUTH0_NAMESPACE,
        BASE_URL: process.env.BASE_URL
    }
}