// 'use strict';
// /*eslint-disable no-console*/
//
// const cron = require('../cron.js');
// const moment = require('moment');
// const Deposit = require('../../models/deposit.js');
// const co = require('co');
//
// //unused
// function sendClosingDepositToCash() {
//     console.log('------------------------');
//     return co(function* () {
//         const now = moment();
//         const client_currents = yield Deposit.getClientCurrents();
//         console.log('qwqwqw');
//         for (let i = 0; i < client_currents.length; i++) {
//             const accCurrent = client_currents[i];
//             const end = moment(accCurrent.end);
//
//             console.log('end', end.toDate());
//             console.log(now.diff(end, 'days') > 0);
//             if (now.diff(end, 'days') > 0) {
//               //send money from fund development to client current
//                 console.log('send money from fund development to client current');
//                 console.log(accCurrent.agreement);
//                 yield Deposit.sendClientsToCash(accCurrent.agreement);
//             }
//         }
//     });
// }
//
// module.exports.subscribe = function subscribe() {
//     cron.on('cron:every_hour2', sendClosingDepositToCash);
// };
