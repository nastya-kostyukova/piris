'use strict';
/*eslint-disable key-spacing*/
const router       = require('koa-router')(); // router middleware for koa
const Client       = require('../../models/client.js');
const Credit       = require('../../models/credit.js');
const moment       = require('moment');

router.get('/credits/account', function*() {
    try {
        console.log(this.state.user.agreementId);
        const cash = yield Credit.getCash();
        yield this.render('get_sum', {
            title: 'Cash account',
            cash,
        });
    } catch (e) {
        this.throw(e.status||500, e.message);
    }
});

module.exports = router.middleware();

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
