'use strict';

/*eslint-disable key-spacing*/
/*eslint-disable no-console*/
const Lib        = require('../lib/lib.js');
const ModelError = require('./modelerror.js');
const Client     = require('./client.js');
const moment     = require('moment');
const Deposit = module.exports = {};

const SQL_SELECT_ALL_CURRENCY = 'SELECT * FROM currency';
const SQL_SELECT_CURRENCY_BY_ID = 'SELECT * FROM currency WHERE id=?';
const SQL_SELECT_CURRENCY_BY_NAME = 'SELECT * FROM currency WHERE name=?';
const SQL_SELECT_ALL_DEPOSITS_TYPES = 'SELECT * FROM deposits_type';
const SQL_SELECT_FUND_DEVELOPMENT = 'SELECT * FROM fund_development';
const SQL_SELECT_BANK_CASH = 'SELECT * FROM cash_account';
const SQL_GET_BALLANCE_ACCOUNTS = 'SELECT name, value FROM balance_accounts';
const SQL_SELECT_DEPOSITS_TYPE = 'SELECT * FROM deposits_type WHERE id=?';
const SQL_SELECT_AGREEMENT_BY_ID = 'SELECT a.idagreement, t.name as type, c.rate as rate,' +
        ' c.name as currency, c.id as idcurrency, a.start, a.end, a.duration, '+
        ' a.init_sum, a.agreement_number, a.name ' +
        'FROM agreement a ' +
        'JOIN deposits_type t ON t.id =a.type ' +
        'JOIN currency c ON c.id = a.currency ' +
        ' WHERE idagreement=?';
const SQL_SELECT_ALL_CLIENT_CURRENT = 'SELECT * FROM client_current WHERE balance != 0';
const SQL_SELECT_CLIENT_CURRENT_BY_ID = 'SELECT * FROM client_current WHERE account_number=?';
const SQL_SELECT_CLIENT_CURRENT_WITH_AGREEMENT = 'SELECT c.account_number, a.start, a.end, ' +
        ' a.duration, a.init_sum, c.agreement, t.percent_min, t.duration_min, t.duration_max, t.percent_max, t.revocable ' +
        'FROM bank.client_current c ' +
        'JOIN agreement a ON a.idagreement=c.agreement ' +
        'JOIN deposits_type t ON a.type=t.id';
const SQL_SELECT_CLIENT_CURRENT_WITH_AGREEMENT_BY_ID = 'SELECT c.account_number, a.start, a.end, ' +
        ' a.duration, a.init_sum, c.agreement, t.percent_min, t.duration_min, t.duration_max, t.percent_max, t.revocable ' +
        'FROM bank.client_current c ' +
        'JOIN agreement a ON a.idagreement=c.agreement ' +
        'JOIN deposits_type t ON a.type=t.id ' +
        'WHERE c.account_number=?';
const SQL_SELECT_CLIENT_PERCENT = 'SELECT * FROM client_percent WHERE agreement=?';
const SQL_SELECT_CLIENT_PERCENT_BY_ID = 'SELECT * FROM client_percent WHERE account_number=?';
const SQL_SELECT_CLIENT_ACCOUNTS = 'SELECT p.account_number as p_account_number, ' +
        'p.active_type as p_active_type, p.agreement, ' +
        'p.balance as p_balance, p.name as p_name, ' +
        'c.account_number as c_account_number, c.active_type as c_active_type, ' +
        'c.balance as c_balance, c.name as c_name ' +
        'FROM client_current c ' +
        'JOIN client_percent p ON c.agreement = p.agreement ';

const SQL_SELECT_CLIENT_CURRENT_BY_AGREEMENT = 'SELECT c.account_number, a.start, a.end,'+
        ' a.init_sum, t.revocable, c.balance ' +
        'FROM client_current c ' +
        'JOIN agreement a ON a.idagreement=c.agreement ' +
        'JOIN deposits_type t ON t.id=a.type ' +
        'WHERE c.agreement=?';

const SQL_CREATE_FUND_DEVELOPMENT = 'INSERT INTO fund_development SET ?';
const SQL_CREATE_BANK_CASH = 'INSERT INTO cash_account SET ?';
const SQL_CREATE_CLIENT_CURRENT = 'INSERT INTO client_current SET ?';
const SQL_CREATE_CLIENT_PROCENT = 'INSERT INTO client_percent SET ?';
const SQL_INSERT_DEPOSIT_TYPES = 'INSERT INTO deposits_type SET ?';
const SQL_INSERT_AGREEMENT = 'INSERT INTO agreement SET ?';

const SQL_UPDATE_CASH = 'UPDATE cash_account SET ? WHERE account_number=?';
const SQL_UPDATE_CLIENT_CURRENT = 'UPDATE client_current SET ? WHERE agreement=?';
const SQL_UPDATE_CLIENT_PERCENT = 'UPDATE client_percent SET ? WHERE account_number=?';
const SQL_UPDATE_FUND_DEVELOPMET = 'UPDATE fund_development SET ? WHERE account_number=?';

const SQL_DELETE_AGREEMENT = 'DELETE from agreement WHERE idagreement=?';
const SQL_DELETE_CLIENT_CURRENT = 'DELETE from client_current WHERE agreement=?';
const SQL_DELETE_CLIENT_PERCENT = 'DELETE from client_percent WHERE agreement=?';

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
    console.log('--- agreement.init_sum', agreement.init_sum);
    yield global.db.query(SQL_UPDATE_CASH,
        [{
            agreements: agreementsInCash,
            balance: +cash_account[0].balance - +agreement.init_sum,
        }, cash_account[0].account_number]);

    return {
        id,
        init_sum: agreement.init_sum,
    };
}

Deposit.closeAgreement = function *(id) {
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

    yield global.db.query(SQL_UPDATE_CASH,
        [{
            agreements: agreementsInCash,
        }, cash_account[0].account_number]);

    return {
        id,
        init_sum: agreement.init_sum,
    };
};

Deposit.getCurrencies = function*() {
    const [Currencies] = yield global.db.query(SQL_SELECT_ALL_CURRENCY);
    return Currencies;
};

Deposit.getDepositTypes = function*() {
    const [DepositTypes] = yield global.db.query(SQL_SELECT_ALL_DEPOSITS_TYPES);
    return DepositTypes;
};

Deposit.getAllClientCurrent =  function* () {
    const db = yield global.connectionPool.getConnection();
    const [clients] = yield db.query(SQL_SELECT_ALL_CLIENT_CURRENT);
    return clients;
};

Deposit.updateFundDevelopent = function * (data, id) {
    const db = yield global.connectionPool.getConnection();
    const [fund_development] = yield db.query(SQL_UPDATE_FUND_DEVELOPMET, [data, id]);
    return fund_development;
};

Deposit.updateClientCurrent = function * (data, id) {
    const db = yield global.connectionPool.getConnection();
    const [client_current] = yield db.query(SQL_UPDATE_CLIENT_CURRENT, [data, id]);
    return client_current;
};

Deposit.getClientCurrents = function * () {
    const db = yield global.connectionPool.getConnection();
    const [client_currents] = yield db.query(SQL_SELECT_CLIENT_CURRENT_WITH_AGREEMENT);
    return client_currents;
};

Deposit.selectClientPercent = function * (id) {
    const db = yield global.connectionPool.getConnection();
    const [client_percent] = yield db.query(SQL_SELECT_CLIENT_PERCENT, id);
    return client_percent[0];
};

Deposit.updateClientPercent = function * (data, id) {
    const db = yield global.connectionPool.getConnection();
    const [client_percent] = yield db.query(SQL_UPDATE_CLIENT_PERCENT, [data, id]);
    return client_percent.insertId;
};

Deposit.getDepositTypesById = function*(id) {
    const [DepositTypes] = yield global.db.query(SQL_SELECT_DEPOSITS_TYPE, id);
    return DepositTypes[0];
};

Deposit.setDepositTypes = function*() {
    try {
        const [DepositTypes] = yield global.db.query(SQL_SELECT_ALL_DEPOSITS_TYPES);
        const values = [{
            name: 'Срочный безотзывный вклад \"Личный выбор\"',
            duration_min: 12,
            duration_max: 36,
            percent_min: 8,
            percent_max: 9,
            available_currency: 1,
        }, {
            name: 'Срочный отзывный банковский вклад',
            duration_min: 3,
            duration_max: 36,
            percent_min: 13,
            percent_max: 15,
            available_currency: 2,
        },
      ];
        if (!DepositTypes.length) {
            for (let i = 0; i < values.length; i++) {
                yield global.db.query(SQL_INSERT_DEPOSIT_TYPES, values[i]);
            }

        }
        return DepositTypes;
    } catch (e) {
        Lib.logException('Set deposit types', e);
        throw ModelError(500, e.message);
    }
};

Deposit.getFundDevelopent = function * () {
    const [fund_development] = yield global.db.query(SQL_SELECT_FUND_DEVELOPMENT);
    return fund_development[0];
};

Deposit.createAccounts = function* (agreement) {
    try {
        const client = yield Client.get(agreement.client);
        const FIO = client.surname + client.name[0] + client.patronymic[0];
        agreement.name = FIO;
        const [currency] = yield global.db.query(SQL_SELECT_CURRENCY_BY_ID, agreement.currency);

        agreement.init_sum = agreement.init_sum / currency[0].rate;
        const [newAgreement] = yield global.db.query(SQL_INSERT_AGREEMENT, agreement);

        console.log('Agreement.insert', newAgreement.insertId, new Date); // eg audit trail?

        /*Create bank accounts*/

        const fund_development = yield Deposit.getFundDevelopent();
        if (!fund_development) {
            const fundNum = yield generateAccountNumber('fund_development');
            yield global.db.query(SQL_CREATE_FUND_DEVELOPMENT, [{
                account_number: fundNum,
                balance: 100000,
            }]);
        }

        const [cash_account] = yield global.db.query(SQL_SELECT_BANK_CASH);
        if(!cash_account.length) {
            const cashNum = yield generateAccountNumber('cash_account');
            yield global.db.query(SQL_CREATE_BANK_CASH, [{
                account_number: cashNum,
            }]);
        }
        console.log('create client arr');
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
        yield addAgreementToCash(newAgreement.insertId, agreement.init_sum);

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

Deposit.deleteMoneyFromCash = function * (id, sum) {
    try {
        const [cash_accounts] = yield global.db.query(SQL_SELECT_BANK_CASH);
        const cash_account = cash_accounts[0];
        if (cash_account.receiveClients.length) {
            let receiveClients = JSON.parse(cash_account.receiveClients).clients;
            const nameCurrency = receiveClients.find((c) => +c.id === +id).currency;
            receiveClients = receiveClients.filter((c) => +c.id !== +id);
            console.log(nameCurrency);
            const [currencies] = yield global.db.query(SQL_SELECT_CURRENCY_BY_NAME, nameCurrency);
            const currency = currencies[0];
            console.log(`Currency name: ${currency.name} rate: ${currency.rate}`);
            console.log(`(+sum / currency.rate) ${+sum} ${currency.rate} ${(+sum / currency.rate)}`);
            // console.log('receiveClients', receiveClients);
            // console.log('+cash_account.balance - +sum', +cash_account.balance - +sum);
            yield global.db.query(SQL_UPDATE_CASH, [{
                receiveClients: JSON.stringify({ clients: receiveClients }),
                balance: Math.round(+cash_account.balance - (+sum / currency.rate)),
            }, cash_account.account_number]);
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
                Lib.logException('delete money from cash', e);
                throw ModelError(500, e.message); // Internal Server Error
        }
    }
};

Deposit.getCash = function * () {
    try {
        const [cash_accounts] = yield global.db.query(SQL_SELECT_BANK_CASH);
        const cash_account = cash_accounts[0];
        if (cash_account.agreements.length) {
            const agreementsId = cash_account.agreements.split(',');

            cash_account.agreements = [];
            for (let i = 0; i < agreementsId.length; i++) {
                const [agreement] = yield global.db.query(SQL_SELECT_AGREEMENT_BY_ID, agreementsId[i]);
                const [currency] = yield global.db.query(SQL_SELECT_CURRENCY_BY_ID, agreement[0].idcurrency);
                agreement[0].init_sum = (+agreement[0].init_sum * +currency[0].rate).toFixed(0);

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

Deposit.getFundDelelopmentWithClients = function * () {
    try {
        const [fund_developments] = yield global.db.query(SQL_SELECT_FUND_DEVELOPMENT);
        const fund_development = fund_developments[0];

        if (fund_development.clients.length) {
            const clientsId = fund_development.clients.split(',');
            fund_development.clients = [];
            for (let i = 0; i < clientsId.length; i++) {
                const [client_current] = yield global.db.query(SQL_SELECT_CLIENT_CURRENT_BY_ID, clientsId[i]);
                fund_development.clients.push(client_current[0]);
            }
        }
        return fund_development;
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
                Lib.logException('Get fund development', e);
                throw ModelError(500, e.message); // Internal Server Error
        }
    }
};

Deposit.sendToClientFromFund = function * (id) {
    try {
        const db = (!global.db)
          ? yield global.connectionPool.getConnection()
          : global.db;

        const [clients] = yield db.query(SQL_SELECT_CLIENT_CURRENT_BY_AGREEMENT, id);
        const client_account = clients[0];
        const [fund_development] = yield db.query(SQL_SELECT_FUND_DEVELOPMENT);

        const end = moment(client_account.end);

        if (!client_account.revocable && moment().diff(end, 'days') < 0) {
            throw ModelError(409, 'Deposit is revocable and date end is in the future');
        }

        if (fund_development[0].clients) {

            let clientsId = fund_development[0].clients.split(',');

            clientsId = clientsId.filter(
                (client) => +client !== +client_account.account_number);
            yield db.query(SQL_UPDATE_FUND_DEVELOPMET,
                [{
                    balance: +fund_development[0].balance - client_account.init_sum,
                    clients: clientsId.join(','),
                }, fund_development[0].account_number]);

            yield db.query(SQL_UPDATE_CLIENT_CURRENT,
                [{ balance: client_account.init_sum }, id]);
        }
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
                Lib.logException('Get client current', e);
                throw ModelError(500, e.message); // Internal Server Error
        }
    }
};

Deposit.sendClientsToCash = function * (id) {
    try {
        const db = (!global.db)
          ? yield global.connectionPool.getConnection()
          : global.db;
        const [client_current] = yield db.query(SQL_SELECT_CLIENT_CURRENT_BY_AGREEMENT, id);
        const [client_percent] = yield db.query(SQL_SELECT_CLIENT_PERCENT, id);
        const [cash] = yield db.query(SQL_SELECT_BANK_CASH);
        const [agreement] = yield db.query(SQL_SELECT_AGREEMENT_BY_ID, id);

        const sumBYN = +client_current[0].balance + +client_percent[0].balance;
        console.log(`+client_current[0].balance ${+client_current[0].balance} +client_percent[0].balance ${+client_percent[0].balance}` );
        // console.log(`rate ${agreement[0].rate}`);
        //const sum = sumBYN * agreement[0].rate;
        // console.log(`sum ${sum}`);

        const receiveClients = (cash[0].receiveClients)
            ? JSON.parse(cash[0].receiveClients).clients
            : [];


        // console.log(sumBYN, agreement[0].rate, sumBYN * agreement[0].rate)
        receiveClients.push({
            id,
            sum: Math.round(sumBYN * agreement[0].rate),
            currency: agreement[0].currency,
        });
        const client = JSON.stringify({
            clients: receiveClients,
        });

        console.log('send client to cash---');
        console.log('+cash[0].balance',+cash[0].balance);
        console.log('+sumBYN', +sumBYN);
        const data = {
            balance: +cash[0].balance + +sumBYN,
            receiveClients: client.toString(),
        };
        yield db.query(SQL_UPDATE_CASH,
            [data, cash[0].account_number]);

        yield db.query(SQL_DELETE_CLIENT_PERCENT, id);
        yield db.query(SQL_DELETE_CLIENT_CURRENT, id);
        return;
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
                Lib.logException('Get client current', e);
                throw ModelError(500, e.message); // Internal Server Error
        }
    }
};

Deposit.getClientAccounts = function * () {
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

Deposit.deleteAgreement = function*(id) {
    try {
        yield deleteAgreementFromCash(id);
        yield global.db.query(SQL_DELETE_AGREEMENT, id);
        yield global.db.query(SQL_DELETE_CLIENT_PERCENT, id);
        yield global.db.query(SQL_DELETE_CLIENT_CURRENT, id);

        console.log('Agreement.delete', id, new Date); // eg audit trail?
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

Deposit.sentToCurrent = function*(id) {
    try {
        const cash = yield deleteAgreementFromCash(id);
        yield global.db.query(SQL_UPDATE_CLIENT_CURRENT,
            [{
                balance: cash.init_sum,
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

Deposit.receivePercent = function*(client_currentId, client_percentId) {
    const now = moment();
    const [client_current] = yield global.db.query(SQL_SELECT_CLIENT_CURRENT_WITH_AGREEMENT_BY_ID, client_currentId);
    const [client_percent] = yield global.db.query(SQL_SELECT_CLIENT_PERCENT_BY_ID, client_percentId);

    const accCurrent = client_current[0];
    const accPercent = client_percent[0];
    const start = moment(accCurrent.start);
    const diff = now.diff(start, 'months');

    let additPercents = Math.floor((diff / accCurrent.duration_min)) - 1;
    additPercents = (additPercents < 0) ? 0 : additPercents;
    let percent = accCurrent.percent_min + additPercents;
    percent = (percent > accCurrent.percent_max) ? accCurrent.percent_max : percent;

    const percentCount = percent * accCurrent.init_sum / 100;

    yield Deposit.updateClientPercent({
        balance: accPercent.balance + percentCount,
    }, client_percentId);
};
