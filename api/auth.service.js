'use strict';

const jwt = require('jsonwebtoken');
const jwtSecret = 'dev_secret';
const logger = require('logger');

module.exports.createAuthToken = (agreementId) => {
    const payload = { agreementId };
    return jwt.sign(payload, jwtSecret, {});
};

module.exports.decodeToken = (token) => {
    let res;

    try {
        res = jwt.verify(token, jwtSecret);
    } catch (err) {
        logger.warn('Invalid json web token', err);
    }

    return res;
};
