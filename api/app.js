/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Simple app to explore Node.js + Koa + MySQL basics for CRUD admin + API                        */
/*                                                                                                */
/* App comprises three (composed) sub-apps:                                                       */
/*  - www.   (public website pages)                                                               */
/*  - admin. (pages for interactively managing data)                                              */
/*  - api.   (RESTful CRUD API)                                                                   */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';
/* eslint no-shadow:off *//* app is already declared in the upper scope */

const koa          = require('koa');               // Koa framework
const body         = require('koa-body');          // body parser
const compose      = require('koa-compose');       // middleware composer
const compress     = require('koa-compress');      // HTTP compression
const responseTime = require('koa-response-time'); // X-Response-Time middleware
const session      = require('koa-session');       // session for passport login, flash messages
const mysql        = require('mysql-co');          // MySQL (co wrapper for mysql2)
const serve        = require('koa-static');
const cors         = require('koa-cors');
const app = module.exports = koa();

app.use(serve('public'));

// return response time in X-Response-Time header
app.use(responseTime());

//app.use(cors());
// HTTP compression
//app.use(compress({}));


// only search-index www subdomain
app.use(function* robots(next) {
    yield next;
    if (this.hostname.slice(0,3) != 'www') this.response.set('X-Robots-Tag', 'noindex, nofollow');
});


// parse request body into ctx.request.body
app.use(body());


// session for passport login, flash messages
// app.keys = ['koa-sample-app'];
// app.use(session(app));


// MySQL connection pool TODO: how to catch connection exception eg invalid password?
const config = require('../config/db-'+app.env+'.json');
global.connectionPool = mysql.createPool(config.db); // put in global to pass to sub-apps


const bodyParser = require('koa-bodyparser');
const handlebars = require('koa-handlebars');
const jwt        = require('koa-jwt');
const jwtSecret  = 'dev_secret';


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

// // private routes
app.use(jwt({ secret: jwtSecret }));
app.use(require('./routes/credit-private.js'));
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

require('./cron.js').scheduleDay();
require('./cron.js').scheduleMonth();

require('./handlers/percents.js').subscribe();
// require('./handlers/close.deposit.js').subscribe();
require('./handlers/fund-development.js').subscribe();
require('./handlers/credit-percent.js').subscribe();



if (!module.parent) {
    /* eslint no-console:off */
    app.listen(process.env.PORT||3000);
    const db = require('../config/db-'+app.env+'.json').db.database;
    console.log(process.version+' listening on port '+(process.env.PORT||3000)+' ('+app.env+'/'+db+')');
}

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
