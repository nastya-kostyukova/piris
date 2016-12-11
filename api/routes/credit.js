'use strict';
/*eslint-disable key-spacing*/
const router       = require('koa-router')(); // router middleware for koa
const Deposit       = require('../../models/deposit.js');
const Client       = require('../../models/client.js');
const Credit       = require('../../models/credit.js');
const moment       = require('moment');
const jwt          = require('koa-jwt');
const jwtSecret    = 'dev_secret';

router.get('/credits/cash', function*() {
    try {
        const cash = yield Credit.getCash();
        yield this.render('cash_credit', {
            title: 'Cash account',
            cash,
        });
    } catch (e) {
        this.throw(e.status||500, e.message);
    }
});

router.get('/credits/get-credit', function *() {
    try {
        const client = yield Credit.getClient();
        yield this.render('get_sum', {
            client,
        });
    } catch(e) {
        this.throw(e.status||500, e.message);
    }
});
router.get('/credits/clients', function*() {
    try {
        const clients = yield Credit.getClientAccounts();
        yield this.render('client-accounts-credit', {
            clients,
        });

    } catch (e) {
        this.throw(e.status||500, e.message);
    }
});

router.get('/credits/add', function*() {
    try {
        const credit_types = yield Credit.getCreditTypes();
        const currencies = yield Deposit.getCurrencies();
        const clients = yield Client.list();
        clients.map((c) => {
            c.birthdate = moment(c.birthdate).format('MM-DD-YYYY');
            c.passport_issue_date = moment(c.passport_issue_date).format('MM-DD-YYYY');
            return { TextRow: c };
        });

        yield this.render('add-credit',{
            title: 'Add credit',
            clients,
            credit_types,
            currencies,
        });

    } catch (e) {
        this.throw(e.status||500, e.message);
    }
});

router.get('/credits/calendar/:id', function*() {
    try {
        const calendar = yield Credit.getCalendar(this.params.id);

        yield this.render('calendar',{
            calendar,
        });
    } catch (e) {
        this.throw(e.status||500, e.message);
    }
});

router.post('/credits/add', function*() {
    try {
        const data = this.request.body;

        const start = moment(data.start);
        const end = moment(data.end);

        const duration = end.diff(start, 'months');
        const credit = yield Credit.getCreditTypesById(data.type);

        if (duration < credit.duration_min) {
            this.throw(409, `Credit duration should be less then ${credit.duration_min} month`);
        }

        delete data.id;
        data.duration = duration;
        const insert = yield Credit.createAccounts(data);
        this.request.body = { id: insert };

        this.redirect('/credits/cash/');
    } catch (e) {
        this.throw(e.status||500, e.message);
    }
});

router.post('/credits/sent-to-current', function * () {
    try {
        const id = this.request.body.id;
        yield Credit.sentToCurrent(id);
        this.redirect('/credits/cash/');
    } catch (e) {
        this.throw(e.status||500, e.message);
    }
});

app.use(jwt({ secret: jwtSecret }));

module.exports = router.middleware();

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
