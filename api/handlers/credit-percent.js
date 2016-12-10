'use strict';
/*eslint-disable no-console*/

const cron = require('../cron.js');
const moment = require('moment');
const Credit = require('../../models/cresit.js');
const co = require('co');

function receivePercents() {
    return co(function* () {
        const now = moment();
        const client_currents = yield Credit.getClientCurrents();
        for (let i = 0; i < client_currents.length; i++) {
            const accCurrent = client_currents[i];
            const end = moment(accCurrent.end);
            const client_percent = yield Credit.selectClientPercent(accCurrent.agreement);


            console.log(`Total percents: ${persentSumTotal}`);
            yield Credit.updateClientPercent({
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
