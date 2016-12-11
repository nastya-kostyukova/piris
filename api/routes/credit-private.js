'use strict';
/*eslint-disable key-spacing*/
const router       = require('koa-router')(); // router middleware for koa
const Credit       = require('../../models/credit.js');
const authService  = require('../auth.service.js');

router.get('/credits/account', function*() {
    try {
        let token = this.request.get('cookie');
        if (token) {
            token = token.indexOf(';') > -1
              ? token.substring(token.indexOf('=') + 1, token.indexOf(';'))
              : token.substring(token.indexOf('=') + 1);
        } else {
            token = this.request.get('Authorization');
            token = token.substring(token.indexOf(' ') + 1);
        }
        if (!token) this.throw(409, 'Permission denied');

        const decodedToken = authService.decodeToken(token);
        if (decodedToken.id) {
            const client = yield Credit.getClient(decodedToken.id);
            yield this.render('sum', {
                title: 'Client account',
                client,
            });
        } else {
            this.status = 403;
        }
    } catch (e) {
        this.throw(e.status||500, e.message);
    }
});

router.post('/credits/take-money', function*() {
    try {
        let token = this.request.get('cookie');
        if (token) {
            token = token.indexOf(';') > -1
              ? token.substring(token.indexOf('=') + 1, token.indexOf(';'))
              : token.substring(token.indexOf('=') + 1);
        } else {
            token = this.request.get('Authorization');
            token = token.substring(token.indexOf(' ') + 1);
        }

        if (!token) this.throw(409, 'Permission denied');
        const decodedToken = authService.decodeToken(token);
        const sum = +this.request.body.sum;

        if (decodedToken.id && !isNaN(sum)) {
            const result = yield Credit.giveSum(decodedToken.id, sum);
            if (!result) {
                this.throw(409, 'Sum is greater then your balance');
            }
            this.redirect('/credits/account');
        } else {
            this.throw(409, 'Permission denied');
        }
    } catch (e) {
        this.throw(e.status||500, e.message);
    }
});

module.exports = router.middleware();

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
