'use strict';

/*eslint-disable key-spacing*/
/*eslint-disable no-console*/
const Lib        = require('../lib/lib.js');
const ModelError = require('./modelerror.js');
const Client     = require('./client.js');
const moment     = require('moment');
const Credit = module.exports = {};

const SQL_SELECT_CURRENCY_BY_ID = 'SELECT * FROM currency WHERE id=?';
const SQL_SELECT_AGREEMENT_BY_ID = 'SELECT a.idagreement_credit, t.name as type, t.fullInEnd as type_p, t.percent as percent, c.rate as rate,' +
        ' c.name as currency, c.id as idcurrency, a.start, a.end, a.duration, '+
        ' a.sum, a.agreement_number, a.name ' +
        'FROM agreement_credit a ' +
        'JOIN credit_type t ON t.id = a.type ' +
        'JOIN currency c ON c.id = a.currency ' +
        ' WHERE idagreement_credit=?';

const SQL_SELECT_BANK_CASH = 'SELECT * FROM cash_account_credit';
const SQL_GET_BALLANCE_ACCOUNTS = 'SELECT name, value FROM balance_accounts';
const SQL_SELECT_ALL_CREDITS_TYPES = 'SELECT * FROM credit_type';
const SQL_SELECT_CREDIT_TYPE_BY_ID = 'SELECT * FROM credit_type WHERE id=?';
const SQL_SELECT_FUND_DEVELOPMENT = 'SELECT * FROM fund_development';
const SQL_SELECT_CLIENT_ACCOUNTS = 'SELECT p.account_number as p_account_number, ' +
        'p.active_type as p_active_type, p.agreement, ' +
        'p.balance as p_balance, p.name as p_name, ' +
        'c.account_number as c_account_number, c.active_type as c_active_type, ' +
        'c.balance as c_balance, c.name as c_name ' +
        'FROM client_current_credit c ' +
        'JOIN client_percent_credit p ON c.agreement = p.agreement';

const SQL_SELECT_CLIENT_ACCOUNT_BY_ID = 'SELECT p.account_number as p_account_number, ' +
        'p.active_type as p_active_type, p.agreement, ' +
        'p.balance as p_balance, p.name as p_name, ' +
        'c.account_number as c_account_number, c.active_type as c_active_type, ' +
        'c.balance as c_balance, c.name as c_name ' +
        'FROM client_current_credit c ' +
        'JOIN client_percent_credit p ON c.agreement = p.agreement ' +
        'WHERE c.agreement=?';

const SQL_SELECT_CLIENT_CURRENT_WITH_AGREEMENT = 'SELECT c.account_number, a.start, a.end, t.fullInEnd as type_p,' +
        ' a.duration, a.sum, c.agreement, t.percent, t.duration_min, t.duration_max ' +
        'FROM bank.client_current_credit c ' +
        'JOIN agreement_credit a ON a.idagreement_credit=c.agreement ' +
        'JOIN credit_type t ON a.type=t.id';

const SQL_SELECT_CLIENT_CURRENT = 'SELECT * FROM client_current_credit WHERE agreement=?';
const SQL_GET_PIN = 'SELECT pin FROM agreement_credit WHERE idagreement_credit=?';

const SQL_SELECT_CLIENT_PERCENT = 'SELECT * FROM client_percent_credit WHERE agreement=?';

const SQL_INSERT_AGREEMENT = 'INSERT INTO agreement_credit SET ?';
const SQL_CREATE_BANK_CASH = 'INSERT INTO cash_account SET ?';
const SQL_CREATE_CLIENT_CURRENT = 'INSERT INTO client_current_credit SET ?';
const SQL_CREATE_CLIENT_PROCENT = 'INSERT INTO client_percent_credit SET ?';

const SQL_UPDATE_CASH = 'UPDATE cash_account_credit SET ? WHERE account_number=?';
const SQL_UPDATE_FUND_DEVELOPMET = 'UPDATE fund_development SET ? WHERE account_number=?';
const SQL_UPDATE_CLIENT_CURRENT = 'UPDATE client_current_credit SET ? WHERE agreement=?';
const SQL_UPDATE_CLIENT_PERCENT = 'UPDATE client_percent_credit SET ? WHERE agreement=?';

function getRandomArbitary(min = 0, max = 9) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function* generateAccountNumber(name) {
    const [balance_accounts] = yield global.db.query(SQL_GET_BALLANCE_ACCOUNTS);
    let number = balance_accounts.find((account) => account.name === name).value;
    for (let i =0; i < 9; i++) {
        number += '' + getRandomArbitary();
    }
    return +number;
}

function createPin() {
    let number = '';
    for (let i =0; i < 4; i++) {
        number += '' + getRandomArbitary();
    }
    return number;
}
function* addAgreementToCash(id, sum) {
    const [cash_account] = yield global.db.query(SQL_SELECT_BANK_CASH);
    let agreementsInCash;
    if (cash_account[0].agreements) {
        cash_account[0].agreements = (cash_account[0].agreements.indexOf(','))
          ? cash_account[0].agreements.split(',')
          : [cash_account[0].agreements];
        cash_account[0].agreements.push(String(id));

        agreementsInCash = cash_account[0].agreements.join(',');
    } else {
        agreementsInCash = String(id);
    }

    yield global.db.query(SQL_UPDATE_CASH,
        [{
            agreements: agreementsInCash,
            balance: +cash_account[0].balance + +sum,
        }, cash_account[0].account_number]);
}

function* deleteAgreementFromCash(id) {
    const [cash_account] = yield global.db.query(SQL_SELECT_BANK_CASH);
    const [res] = yield global.db.query(SQL_SELECT_AGREEMENT_BY_ID, id);
    const agreement = res[0];

    let agreementsInCash;
    if (cash_account[0].agreements) {
        cash_account[0].agreements = cash_account[0].agreements.split(',');
        cash_account[0].agreements = cash_account[0].agreements.filter((a) => a !== id);
        agreementsInCash = cash_account[0].agreements.join(',');
    } else {
        agreementsInCash = '';
    }

    console.log(cash_account[0]);
    console.log('---deleting sum from cash', +cash_account[0].balance);
    console.log('---agreement.rate', agreement.rate);
    console.log('--- agreement.init_sum', agreement.sum);
    yield global.db.query(SQL_UPDATE_CASH,
        [{
            agreements: agreementsInCash,
            balance: +cash_account[0].balance - +agreement.sum,
        }, cash_account[0].account_number]);

    return {
        id,
        sum: agreement.sum,
    };
}

Credit.getDiscretCalendar = function (startDate, endDate, sum, percent, isReceivePercent) {
    let persentSumMonth = 0;
    const persentSumTotal = [];
    let allSum = sum;
    let i = 1;
    const start = moment(startDate);
    const end = moment(endDate);
    const diffSum = sum / end.diff(start, 'month');
    // console.log(`diffSum ${diffSum}`);
    //Вся сумма - процент за день * размер периода* номер периода

    while(start.diff(end, 'months') < 0) {
        // console.log(`allSum ${allSum} daysInMonth ${start.daysInMonth()}  ${i}`);
        persentSumMonth =  percent / 100 * allSum * start.daysInMonth();
        // console.log(`persentSumMonth ${persentSumMonth}`);
        allSum -= diffSum;
        persentSumTotal.push({
            sum: persentSumMonth,
            title: `${i} ${start.format('MMMM')}`,
        });
        start.add(1, 'months');
        i++;
    }
    if (isReceivePercent) {
        persentSumTotal.push({
            sum: percent / 100 * allSum * end.diff(start, 'days'),
            title: 'Percent for this month',
        });
    }
    return persentSumTotal;
};

Credit.getRegularCalendar = function (startDate, endDate, sum, percent, isReceivePercent) {
    const persentSumTotal = [];
    let i = 1;
    const start = moment(startDate);
    const end = moment(endDate);

    while(start.diff(end, 'months') < 0) {
        persentSumTotal.push({
            sum: percent / 100 * sum * start.daysInMonth(),
            title: `${i} ${start.format('MMMM')}`,
        });
        i++;
        start.add(1, 'months');
    }
    if (isReceivePercent) {
        persentSumTotal.push({
            sum: percent / 100 * sum * end.diff(start, 'days'),
            title: 'Percent for this month',
        });
    }
    return persentSumTotal;
};

Credit.getCash = function * () {
    try {
        const [cash_accounts] = yield global.db.query(SQL_SELECT_BANK_CASH);
        const cash_account = cash_accounts[0];
        if (cash_account.agreements.length) {
            const agreementsId = cash_account.agreements.split(',');

            cash_account.agreements = [];
            for (let i = 0; i < agreementsId.length; i++) {
                const [agreement] = yield global.db.query(SQL_SELECT_AGREEMENT_BY_ID, agreementsId[i]);
                const [currency] = yield global.db.query(SQL_SELECT_CURRENCY_BY_ID, agreement[0].idcurrency);
                agreement[0].sum = (+agreement[0].sum * +currency[0].rate).toFixed(0);

                agreement[0].start = moment(agreement[0].start).format('YYYY-MM-DD');
                agreement[0].end = moment(agreement[0].end).format('YYYY-MM-DD');
                cash_account.agreements.push(agreement[0]);
            }
        }

        if (cash_account.receiveClients) {
            const receiveClients = JSON.parse(cash_account.receiveClients).clients;
            cash_account.receiveClients = receiveClients;
        }
        return cash_account;
    } catch (e) {
        switch (e.code) {
            // recognised errors for Client.update - just use default MySQL messages for now
            case 'ER_BAD_NULL_ERROR':
            case 'ER_NO_REFERENCED_ROW_2':
            case 'ER_NO_DEFAULT_FOR_FIELD':
                throw ModelError(403, e.message); // Forbidden
            case 'ER_DUP_ENTRY':
                throw ModelError(409, e.message); // Conflict
            default:
                Lib.logException('Get cash', e);
                throw ModelError(500, e.message); // Internal Server Error
        }
    }
};

Credit.getCreditTypes = function * () {
    const [CreditTypes] = yield global.db.query(SQL_SELECT_ALL_CREDITS_TYPES);
    return CreditTypes;
};

Credit.getCreditTypesById = function * (id) {
    const [CreditType] = yield global.db.query(SQL_SELECT_CREDIT_TYPE_BY_ID, id);
    return CreditType[0];
};

Credit.createAccounts = function* (agreement) {
    try {
        const client = yield Client.get(agreement.client);
        const FIO = client.surname + client.name[0] + client.patronymic[0];
        agreement.name = FIO;
        const [currency] = yield global.db.query(SQL_SELECT_CURRENCY_BY_ID, agreement.currency);
        agreement.sum = agreement.sum / currency[0].rate;
        agreement.pin = createPin();
        const [newAgreement] = yield global.db.query(SQL_INSERT_AGREEMENT, agreement);

        console.log('Agreement.insert', newAgreement.insertId, new Date); // eg audit trail?

        const [cash_account] = yield global.db.query(SQL_SELECT_BANK_CASH);
        if(!cash_account.length) {
            const cashNum = yield generateAccountNumber('cash_account');
            yield global.db.query(SQL_CREATE_BANK_CASH, [{
                account_number: cashNum,
            }]);
        }

        /*Create client accounts*/
        const currentNum = yield generateAccountNumber('client_current');
        yield global.db.query(SQL_CREATE_CLIENT_CURRENT, [
            {
                account_number: currentNum,
                name: FIO,
                agreement: newAgreement.insertId,
            }]);
        const percentNum = yield generateAccountNumber('client_credit');
        yield global.db.query(SQL_CREATE_CLIENT_PROCENT, [{
            account_number: percentNum,
            name: FIO,
            agreement: newAgreement.insertId,
        }]);

        /*Recieve money to bank cash*/
        yield addAgreementToCash(newAgreement.insertId, agreement.sum);

        // get money from fund development
        const [fund_development] = yield global.db.query(SQL_SELECT_FUND_DEVELOPMENT);
        yield global.db.query(SQL_UPDATE_FUND_DEVELOPMET, [{
            balance: fund_development[0].balance - agreement.sum,
        }, fund_development[0].account_number]);

        return newAgreement.insertId;
    } catch (e) {
        switch (e.code) {
            // recognised errors for Client.update - just use default MySQL messages for now
            case 'ER_BAD_NULL_ERROR':
            case 'ER_NO_REFERENCED_ROW_2':
            case 'ER_NO_DEFAULT_FOR_FIELD':
                throw ModelError(403, e.message); // Forbidden
            case 'ER_DUP_ENTRY':
                throw ModelError(409, e.message); // Conflict
            default:
                Lib.logException('Create account', e);
                throw ModelError(500, e.message); // Internal Server Error
        }
    }
};

Credit.sentToCurrent = function * (id){
    try {
        const cash = yield deleteAgreementFromCash(id);
        yield global.db.query(SQL_UPDATE_CLIENT_CURRENT,
            [{
                balance: cash.sum,
            }, id]);
        const [clients] = yield global.db.query(SQL_SELECT_AGREEMENT_BY_ID, id);
        const client = clients[0];
        let sum = 0;
        let calendar;
        const now = moment();
        const end = moment(client.end);
        const endDate = (now.diff(end) > 0) ? end : now;

        if (+client.type_p) {
            calendar = Credit.getDiscretCalendar(client.start, endDate.toDate(), client.sum, client.percent, true);

        } else {
            calendar = Credit.getRegularCalendar(client.start, endDate.toDate(), client.sum, client.percent, true);
        }
        calendar.forEach((raw) => {
            sum += raw.sum;
        });
        yield global.db.query(SQL_UPDATE_CLIENT_PERCENT,
            [{
                balance: -sum,
            }, id]);
        console.log('Update.client_current', id, new Date); // eg audit trail?
    } catch (e) {
        switch (e.code) {
            // recognised errors for Client.update - just use default MySQL messages for now
            case 'ER_BAD_NULL_ERROR':
            case 'ER_NO_REFERENCED_ROW_2':
            case 'ER_NO_DEFAULT_FOR_FIELD':
                throw ModelError(403, e.message); // Forbidden
            case 'ER_DUP_ENTRY':
                throw ModelError(409, e.message); // Conflict
            default:
                Lib.logException('Client.insert', e);
                throw ModelError(500, e.message); // Internal Server Error
        }
    }
};

Credit.getClientAccounts = function * () {
    try {
        const [clients] = yield global.db.query(SQL_SELECT_CLIENT_ACCOUNTS);
        return clients;
    } catch(e) {
        switch (e.code) {
            // recognised errors for Client.update - just use default MySQL messages for now
            case 'ER_BAD_NULL_ERROR':
            case 'ER_NO_REFERENCED_ROW_2':
            case 'ER_NO_DEFAULT_FOR_FIELD':
                throw ModelError(403, e.message); // Forbidden
            case 'ER_DUP_ENTRY':
                throw ModelError(409, e.message); // Conflict
            default:
                Lib.logException('Get clients accounts', e);
                throw ModelError(500, e.message); // Internal Server Error
        }
    }
};

Credit.getCalendar = function * (id) {
    try {
        const [clients] = yield global.db.query(SQL_SELECT_AGREEMENT_BY_ID, id);
        const client = clients[0];
        let calendar;
        if (+client.type_p) {
            calendar = Credit.getDiscretCalendar(client.start, client.end, client.sum, client.percent);
        } else {
            calendar = Credit.getRegularCalendar(client.start, client.end, client.sum, client.percent);
        }
        return calendar;
    } catch(e) {
        switch (e.code) {
            // recognised errors for Client.update - just use default MySQL messages for now
            case 'ER_BAD_NULL_ERROR':
            case 'ER_NO_REFERENCED_ROW_2':
            case 'ER_NO_DEFAULT_FOR_FIELD':
                throw ModelError(403, e.message); // Forbidden
            case 'ER_DUP_ENTRY':
                throw ModelError(409, e.message); // Conflict
            default:
                Lib.logException('Get clients accounts', e);
                throw ModelError(500, e.message); // Internal Server Error
        }
    }
};

Credit.getClientCurrents = function * () {
    const db = (!global) ? yield global.connectionPool.getConnection() : global.db;
    const [client_currents] = yield db.query(SQL_SELECT_CLIENT_CURRENT_WITH_AGREEMENT);
    return client_currents;
};

Credit.selectClientPercent = function * (id) {
    const db = (!global) ? yield global.connectionPool.getConnection() : global.db;
    const [client_percent] = yield db.query(SQL_SELECT_CLIENT_PERCENT, id);
    return client_percent[0];
};

Credit.checkPin = function* (id, receivePin) {
    const [agreements] = yield global.db.query(SQL_GET_PIN, id);
    const pin = agreements[0].pin;
    return (+pin === +receivePin);
};

Credit.getClient = function * (id) {
    try {
        const [clients] = yield global.db.query(SQL_SELECT_CLIENT_ACCOUNT_BY_ID, id);
        return clients[0];
    } catch(e) {
        switch (e.code) {
            // recognised errors for Client.update - just use default MySQL messages for now
            case 'ER_BAD_NULL_ERROR':
            case 'ER_NO_REFERENCED_ROW_2':
            case 'ER_NO_DEFAULT_FOR_FIELD':
                throw ModelError(403, e.message); // Forbidden
            case 'ER_DUP_ENTRY':
                throw ModelError(409, e.message); // Conflict
            default:
                Lib.logException('Get clients accounts', e);
                throw ModelError(500, e.message); // Internal Server Error
        }
    }
};

Credit.giveSum = function * (id, sum) {
    try {
        const [clients] = yield global.db.query(SQL_SELECT_CLIENT_CURRENT, id);
        const client = clients[0];
        console.log(client.balance);
        console.log(sum);
        if (client.balance >= sum) {
            yield global.db.query(SQL_UPDATE_CLIENT_CURRENT,
              [{
                  balance: client.balance - sum,
              }, id]);
              return true;
        } else {
            return false;
        }
    } catch(e) {
        switch (e.code) {
            // recognised errors for Client.update - just use default MySQL messages for now
            case 'ER_BAD_NULL_ERROR':
            case 'ER_NO_REFERENCED_ROW_2':
            case 'ER_NO_DEFAULT_FOR_FIELD':
                throw ModelError(403, e.message); // Forbidden
            case 'ER_DUP_ENTRY':
                throw ModelError(409, e.message); // Conflict
            default:
                Lib.logException('Get clients accounts', e);
                throw ModelError(500, e.message); // Internal Server Error
        }
    }
};
