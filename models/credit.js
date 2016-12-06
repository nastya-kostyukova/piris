'use strict';

/*eslint-disable key-spacing*/
/*eslint-disable no-console*/
const Lib        = require('../lib/lib.js');
const ModelError = require('./modelerror.js');
const Client     = require('./client.js');
const moment     = require('moment');
const Credit = module.exports = {};

const SQL_SELECT_CURRENCY_BY_ID = 'SELECT * FROM currency WHERE id=?';
const SQL_SELECT_AGREEMENT_BY_ID = 'SELECT a.idagreement_credit, t.name as type, c.rate as rate,' +
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

const SQL_INSERT_AGREEMENT = 'INSERT INTO agreement_credit SET ?';
const SQL_CREATE_BANK_CASH = 'INSERT INTO cash_account SET ?';
const SQL_CREATE_CLIENT_CURRENT = 'INSERT INTO client_current_credit SET ?';
const SQL_CREATE_CLIENT_PROCENT = 'INSERT INTO client_percent_credit SET ?';

const SQL_UPDATE_CASH = 'UPDATE cash_account_credit SET ? WHERE account_number=?';

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
    console.log(agreementsInCash);
    yield global.db.query(SQL_UPDATE_CASH,
        [{
            agreements: agreementsInCash,
            balance: +cash_account[0].balance + +sum,
        }, cash_account[0].account_number]);
}

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
        console.log(agreement);
        const [newAgreement] = yield global.db.query(SQL_INSERT_AGREEMENT, agreement);

        console.log('Agreement.insert', newAgreement.insertId, new Date); // eg audit trail?

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
        yield addAgreementToCash(newAgreement.insertId, agreement.sum);

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
