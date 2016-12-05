/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Clients routes                                                                                */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const router       = require('koa-router')(); // router middleware for koa
const Client       = require('../../models/client.js');
const moment       = require('moment');

router.get('/clients', function*() {
    try {
        const clients = yield Client.list();
        clients.map((c) => {
            c.birthdate = moment(c.birthdate).format('MM-DD-YYYY');
            c.passport_issue_date = moment(c.passport_issue_date).format('MM-DD-YYYY');
            return { TextRow: c };
        });
        yield this.render('list', {
            title: 'Clients',
            clients,
        });

    } catch (e) {
        this.throw(e.status||500, e.message);
    }
});

router.get('/clients/add', function*() {
    try {
        //this.request.body = yield castBoolean.fromStrings('Client', this.request.body);
        const query = this.request.query;

        const cities = yield Client.getCities();
        const citizenship = yield Client.getCitizenship();
        const disabilities = yield Client.getDisabilities();
        const martialStatus = yield Client.getMartialStatus();
        let client = {};

        if (query.id) {
            client = yield Client.get(query.id);
            client.birthdate = moment(client.birthdate).format('YYYY-MM-DD');
            client.passport_issue_date = moment(client.passport_issue_date).format('YYYY-MM-DD');
            cities.map((city) => {
                city.selected = city.id == client.city;
                return city;
            });
            citizenship.map((c) => {
                c.selected = c.id == client.citizenship;
                return c;
            });
            disabilities.map((d) => {
                d.selected = d.id == client.disability;
                return d;
            });
            martialStatus.map((m) => {
                m.selected = m.id == client.martial_status;
            });
        }

        yield this.render('add-client',{
            title: 'Add client',
            cities,
            citizenship,
            disabilities,
            martialStatus,
            client,
        });

    } catch (e) {
        this.throw(e.status||500, e.message);
    }
});

router.post('/clients/add', function*() {
    try {
        const data = this.request.body;
        const id = data.id;
        if (id == '') {
            delete data.id;
            const insert = yield Client.insert(data);
            this.request.body = { id: insert };
        } else {
            delete data.id;
            const update = yield Client.update(id, data);
            this.request.body = { id: update };
        }
        this.set('Location', '/clients/');
        this.status = 200;

    } catch (e) {
        this.throw(e.status||500, e.message);
    }
});

router.post('/clients/delete', function*() {
    try {
        const id = this.request.body.id;
        const deleting = yield Client.delete(id);
        this.request.body = { id: deleting };
        this.status = 200;
    } catch (e) {
        this.throw(e.status||500, e.message);
    }
});

module.exports = router.middleware();

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
