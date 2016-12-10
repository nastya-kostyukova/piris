'use strict';
/*eslint-disable no-console*/

const cron = require('../cron.js');
const moment = require('moment');
const Credit = require('../../models/credit.js');
const co = require('co');

function receivePercents() {
    return co(function* () {
        const now = moment();
        const client_currents = yield Credit.getClientCurrents();
        console.log(`Percent credit user count ${client_currents.length}`);
        for (let i = 0; i < client_currents.length; i++) {
            const accCurrent = client_currents[i];
            let sum = 0;
            let calendar;

            const end = moment(accCurrent.end);
            const endDate = (now.diff(end) > 0) ? end : now;
            console.log(endDate.toDate());
            if (+accCurrent.type_p) {
                calendar = Credit.getDiscretCalendar(accCurrent.start, endDate.toDate(), accCurrent.sum, accCurrent.percent, true);
            } else {
                calendar = Credit.getRegularCalendar(accCurrent.start, endDate.toDate(), accCurrent.sum, accCurrent.percent, true);
            }
            console.log(calendar);
            calendar.forEach((raw) => {
                sum += raw.sum;
            });
            const client_percent = yield Credit.selectClientPercent(accCurrent.agreement);
            console.log(`Credit percent: ${accCurrent.agreement} current sum ${client_percent.balance} new sum ${-sum}`);
            if (client_percent.balance + sum > 0.001) {
                console.log(`new percent sum'll receive ${-sum}`);
                // yield Credit.updateClientPercent({
                //     balance: sum,
                // }, client_percent.account_number);
            }
        }
    });
}

module.exports.subscribe = function subscribe() {
    cron.on('cron:every_day_credit', receivePercents);
};
