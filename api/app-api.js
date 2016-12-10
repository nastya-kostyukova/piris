/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* API app - RESTful API for API interface and/or ajax functions.                                 */
/*                                                                                                */
/* The API provides GET / POST / PATCH / DELETE methods on a variety of resources.                */
/*                                                                                                */
/* 2xx responses honour the request Accept type (json/xml/yaml/text) for the response body;       */
/* 4xx/5xx responses provide a simple text message in the body.                                   */
/*                                                                                                */
/* A GET on a collection which returns no results returns a 204 / No Content response.            */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const koa       = require('koa');        // Koa framework
const bodyParser = require('koa-bodyparser');
const handlebars = require('koa-handlebars');

const app = module.exports = koa();

app.use(bodyParser());

app.use(handlebars({
    defaultLayout: 'layout',
    helpers: {
        if_eq: (a, b, opts) => (a == b) ? opts.fn(this) : opts.inverse(this),
    },
}));

// set up MySQL connection
app.use(function* mysqlConnection(next) {
    // keep copy of this.db in global for access from models
    this.db = global.db = yield global.connectionPool.getConnection();
    // traditional mode ensures not null is respected for unsupplied fields, ensures valid JavaScript dates, etc
    yield this.db.query('SET SESSION sql_mode = "TRADITIONAL"');

    yield next;

    this.db.release();
});

// // handle thrown or uncaught exceptions anywhere down the line
app.use(function* handleErrors(next) {
    try {
        yield next;
    } catch (e) {
        switch (e.status) {
            case 204: // No Content
                this.status = e.status;
                break;
            case 401: // Unauthorized
                this.status = e.status;
                this.set('WWW-Authenticate', 'Basic');
                break;
            case 403: // Forbidden
            case 404: // Not Found
            case 406: // Not Acceptable
            case 409: // Conflict
                this.status = e.status;
                this.body = e.message;
                this.response.body = e.message;
                break;
            default: // report 500 Internal Server Error
                this.status = e.status || 500;
                this.response.body = app.env=='development' ? e.stack : e.message;
                this.app.emit('error', e, this); // github.com/koajs/examples/blob/master/errors/app.js
        }
    }
});

// ------------ routing

// public (unsecured) modules first

app.use(require('./routes/root.js'));
app.use(require('./routes/client.js'));
app.use(require('./routes/deposit.js'));
app.use(require('./routes/credit.js'));
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

require('./cron.js').scheduleDay();
require('./cron.js').scheduleMonth();

require('./handlers/percents.js').subscribe();
// require('./handlers/close.deposit.js').subscribe();
require('./handlers/fund-development.js').subscribe();
require('./handlers/credit-percent.js').subscribe();
