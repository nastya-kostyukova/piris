'use strict';
/*eslint-disable no-console*/

const cron = require('../cron.js');
const moment = require('moment');
const Deposit = require('../../models/deposit.js');
const co = require('co');

function * checkPercentSum(accCurrent) {
    let persentSumTotal = 0;
    const start = moment(accCurrent.start);
    const end = moment(accCurrent.end);
    console.log(`Count deposit days ${start.diff(end, 'days')}`);
    while(start.diff(end, 'days') < 0) {
        const diff = start.diff(end, 'months');
        let additPercents = Math.floor((diff / accCurrent.duration_min)) - 1;
        additPercents = (additPercents < 0) ? 0 : additPercents;
        let percent = accCurrent.percent_min + additPercents;
        percent = (percent > accCurrent.percent_max) ? accCurrent.percent_max : percent;
        const percentCount = percent * accCurrent.init_sum / 100;
        persentSumTotal += percentCount;
        start.add(1, 'days');
    }

    return persentSumTotal;
}

function receivePercents() {
    return co(function* () {
        const now = moment();
        const client_currents = yield Deposit.getClientCurrents();
        for (let i = 0; i < client_currents.length; i++) {
            const accCurrent = client_currents[i];
            const end = moment(accCurrent.end);
            const client_percent = yield Deposit.selectClientPercent(accCurrent.agreement);

            const persentSumTotal = yield checkPercentSum(accCurrent);
            console.log(`Total percents: ${persentSumTotal}`);
            yield Deposit.updateClientPercent({
                balance: client_percent.balance + persentSumTotal,
            }, client_percent.account_number);
              // console.log('-----------------');
            if (now.diff(end, 'days') > 0) {
              //send money from fund development to client current
                console.log('send money from fund development to client current');
                console.log(accCurrent.agreement);
                yield Deposit.sendToClientFromFund(accCurrent.agreement);
                yield Deposit.sendClientsToCash(accCurrent.agreement);
                // yield checkPercentSum(accCurrent);
            }
        }
    });
}

module.exports.subscribe = function subscribe() {
    cron.on('cron:every_day', receivePercents);
};
