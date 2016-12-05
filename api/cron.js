'use strict';

const cron = require('node-cron');
const EventEmitter = require('events');
const emitter = new EventEmitter();

module.exports = emitter;

module.exports.scheduleDay = function schedule() {
    cron.schedule('*/23 * * * * *', () => {//fund_development
        emitter.emit('cron:every_hour');
    });
    //
    // cron.schedule('*/2 * * * *', () => {//close
    //     emitter.emit('cron:every_hour2');
    // });
};

module.exports.scheduleMonth = function schedule() {
    cron.schedule('*/57 * * * * *', () => {//percent
        emitter.emit('cron:every_day');
    });
};
