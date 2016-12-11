'use strict';
/*eslint-disable key-spacing*/
const router       = require('koa-router')(); // router middleware for koa
const Credit       = require('../../models/credit.js');
const authService  = require('../auth.service.js');

let session = {};
router.get('/credits/account', function*() {
    try {
        let token = this.request.get('Authorization');
        token = token.substring(token.indexOf(' ') + 1);
        const res = authService.decodeToken(token);
        session = { id: res.id };
        this.response.body = '';
    } catch (e) {
        this.throw(e.status||500, e.message);
    }
});

router.get('/credits/home', function*() {
    try {
        const client = yield Credit.getClient(session.id);
        console.log(client);
        yield this.render('get-sum', {
            title: 'Client account',
            client,
        });
    } catch (e) {
        this.throw(e.status||500, e.message);
    }
});
module.exports = router.middleware();

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
