'use strict';

const cron = require('../cron.js');
const Deposit = require('../../models/deposit.js');
const co = require('co');

function sendMoney() {
    return co(function* sendInBackground() {
        console.log('---update fund development---');
        const users = yield Deposit.getAllClientCurrent();
        console.log(`users count: ${users.length}`);
        if (users && users.length) {
            const fund_development = yield Deposit.getFundDevelopent();
            const accountsId = [];
            users.forEach((user) => {
                accountsId.push(user.account_number);
                fund_development.balance += user.balance;
            });

            if (accountsId.length) {
                fund_development.clients = accountsId.join(',');

                yield Deposit.updateFundDevelopent({
                    balance: fund_development.balance,
                    clients: fund_development.clients,
                }, fund_development.account_number);
            }

            for(let i = 0; i < users.length; i++) {
                yield Deposit.updateClientCurrent({ balance: 0 }, users[i].agreement);
            }
        }
        console.log('---finished updating fund---');
    });
}

module.exports.subscribe = function subscribe() {
    cron.on('cron:every_hour', sendMoney);
};
