'use strict';

const jwt = require('jsonwebtoken');
const jwtSecret = 'dev_secret';

module.exports.createAuthToken = (agreementId) => {
    const payload = { agreementId };
    return jwt.sign(payload, jwtSecret, {});
};

module.exports.decodeToken = (token) => {
    let res;

    try {
        res = jwt.verify(token, jwtSecret);
    } catch (err) {
        console.log('Invalid json web token', err);
    }

    return res;
};
