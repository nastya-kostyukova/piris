'use strict';
/*eslint-disable key-spacing*/
const router       = require('koa-router')(); // router middleware for koa
const Deposit       = require('../../models/deposit.js');
const Client       = require('../../models/client.js');
const moment       = require('moment');

router.get('/deposits/cash', function*() {
    try {
        const cash = yield Deposit.getCash();
        yield this.render('cash', {
            title: 'Cash account',
            cash,
        });
    } catch (e) {
        this.throw(e.status||500, e.message);
    }
});

router.get('/deposits/clients', function*() {
    try {
        const clients = yield Deposit.getClientAccounts();
        yield this.render('client-accounts', {
            clients,
        });

    } catch (e) {
        this.throw(e.status||500, e.message);
    }
});

router.get('/deposits/fund_development', function*() {
    try {
        const fund_development = yield Deposit.getFundDelelopmentWithClients();
        yield this.render('fund_development', {
            title: 'Fund development',
            fund_development,
        });

    } catch (e) {
        this.throw(e.status||500, e.message);
    }
});

router.get('/deposits/programs', function*() {
    try {
        yield Deposit.setDepositTypes();
        const deposits_types = yield Deposit.getDepositTypes();

        for(let i = 0; i < deposits_types.length; i++) {
            const duration = [];
            const percent_min = deposits_types[i].percent_min;
            const percent_max = deposits_types[i].percent_max;
            let duration_min = deposits_types[i].duration_min;

            for(let j = percent_min; j <= percent_max; j++) {
                duration.push({
                    duration: duration_min,
                    percent: j,
                });
                duration_min *=2;
            }
            deposits_types[i].duration = duration;
        }

        yield this.render('deposit-programs',{
            title: 'Deposit programs',
            deposits_types,
        });
    } catch (e) {
        this.throw(e.status||500, e.message);
    }
});

router.get('/deposits/add', function*() {
    try {
        yield Deposit.setDepositTypes();
        const deposits_types = yield Deposit.getDepositTypes();

        for(let i = 0; i < deposits_types.length; i++) {
            const duration = [];
            const percent_min = deposits_types[i].percent_min;
            const percent_max = deposits_types[i].percent_max;
            let duration_min = deposits_types[i].duration_min;
            for(let j = percent_min; j <= percent_max; j++) {
                duration.push({
                    duration: duration_min,
                    percent: j,
                });
                duration_min *=2;
            }

            deposits_types[i].duration = duration;
        }
        const currencies = yield Deposit.getCurrencies();
        // const query = this.request.query;
        const clients = yield Client.list();
        clients.map((c) => {
            c.birthdate = moment(c.birthdate).format('MM-DD-YYYY');
            c.passport_issue_date = moment(c.passport_issue_date).format('MM-DD-YYYY');
            return { TextRow: c };
        });

        yield this.render('add-deposits',{
            title: 'Add deposit',
            clients,
            deposits_types,
            currencies,
        });

    } catch (e) {
        this.throw(e.status||500, e.message);
    }
});

router.post('/deposits/add', function*() {
    try {
        const data = this.request.body;

        const start = moment(data.start);
        const end = moment(data.end);

        const duration = end.diff(start, 'months');
        const deposit = yield Deposit.getDepositTypesById(data.type);

        if (duration < deposit.duration_min) {
            this.throw(409, 'Deposit duration is too small');
        }

        delete data.id;
        data.duration = duration;
        const insert = yield Deposit.createAccounts(data);
        this.request.body = { id: insert };

        this.redirect('/deposits/cash/');
    } catch (e) {
        this.throw(e.status||500, e.message);
    }
});

router.post('/deposits/give-money', function*() {
    try {
        const id = this.request.body.agreement;
        yield Deposit.sendToClientFromFund(id);
        yield Deposit.sendClientsToCash(id);
        this.redirect('/deposits/cash/');
        // this.status = 201;
    } catch (e) {
        this.throw(409, e.message);
    }
});

router.post('/deposits/delete', function*() {
    try {
        const id = this.request.body.id;
        yield Deposit.deleteAgreement(id);
        this.redirect('/deposits/cash/');
    } catch (e) {
        this.throw(e.status||500, e.message);
    }
});

router.post('/deposits/sent-to-current', function*() {
    try {
        const id = this.request.body.id;
        yield Deposit.sentToCurrent(id);
        this.redirect('/deposits/cash/');
    } catch (e) {
        this.throw(e.status||500, e.message);
    }
});

router.post('/deposits/fromCash', function *() {
    try {
        const id = this.request.body.id;
        const sum = this.request.body.sum;
        yield Deposit.deleteMoneyFromCash(id, sum);
        yield Deposit.closeAgreement(id);
        this.status = 201;
    } catch (e) {
        this.throw(e.status||500, e.message);
    }
});

router.post('/deposits/receive-percent', function * () {
    try {
        const client_current = this.request.body.client_current;
        const client_percent = this.request.body.client_percent;
        yield Deposit.receivePercent(client_current, client_percent);
        this.status = 201;
    } catch (e) {
        this.throw(e.status||500, e.message);
    }
});
module.exports = router.middleware();

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
