/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Client model                                                                                   */
/*                                                                                                */
/* All database modifications go through the model; most querying is in the handlers.             */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';


const Lib        = require('../lib/lib.js');
const ModelError = require('./modelerror.js');

const Client = module.exports = {};

const SQL_SELECT_CLIENT_BY_ID = 'SELECT client.*, c.name as city_name, cit.name as citizenship_name, ' +
        'st.name as martial_status_name, dis.name as disability_name FROM ' +
        'client ' +
        'JOIN city c ON client.city = c.id ' +
        'JOIN citizenship cit ON client.citizenship = cit.id ' +
        'JOIN martial_status st ON client.martial_status = st.id ' +
        'JOIN disability dis ON client.disability = dis.id ' +
        'WHERE idclient = ?';

const SQL_SELECT_ALL_CLIENTS_ASC = 'SELECT client.*, c.name as city_name, cit.name as citizenship_name, ' +
        'st.name as martial_status_name, dis.name as disability_name FROM ' +
        'client ' +
        'JOIN city c ON client.city = c.id ' +
        'JOIN citizenship cit ON client.citizenship = cit.id ' +
        'JOIN martial_status st ON client.martial_status = st.id ' +
        'JOIN disability dis ON client.disability = dis.id ' +
        'ORDER BY surname ASC ';

const SQL_UPDATE_CLIENT = 'UPDATE client SET ? WHERE idclient=?';

const SQL_INSERT_CLIENT = 'INSERT INTO client SET ?';

const SQL_SELECT_ALL_CITIES = 'SELECT id, name FROM city';
const SQL_SELECT_ALL_CITIZENSHIPS = 'SELECT id, name FROM citizenship';
const SQL_SELECT_ALL_MARTIAL_STATUSES = 'SELECT id, name FROM martial_status';
const SQL_SELECT_ALL_DISABILITIES = 'SELECT id, name FROM disability';
const SQL_DELETE_CLIENT = 'DELETE FROM client WHERE idclient=?';

/**
 * Returns Client details (convenience wrapper for single Client details).
 *
 * @param   {number} id - Client id or undefined if not found.
 * @returns {Object} Client details.
 */
Client.get = function*(id) {
    const [Clients] = yield global.db.query(SQL_SELECT_CLIENT_BY_ID, id);
    const Client = Clients[0];
    return Client;
};

Client.getCities = function*() {
    const [Clients] = yield global.db.query(SQL_SELECT_ALL_CITIES);
    return Clients;
};

Client.getCitizenship = function*() {
    const [Clients] = yield global.db.query(SQL_SELECT_ALL_CITIZENSHIPS);
    return Clients;
};

Client.getDisabilities = function*() {
    const [Clients] = yield global.db.query(SQL_SELECT_ALL_DISABILITIES);
    return Clients;
};

Client.getMartialStatus = function*() {
    const [Clients] = yield global.db.query(SQL_SELECT_ALL_MARTIAL_STATUSES);
    return Clients;
};
/**
 * Returns all Clients details (convenience wrapper for single Client details).
 *
 * @returns {Object} Client list.
 */
Client.list = function*() {
    const [Clients] = yield global.db.query(SQL_SELECT_ALL_CLIENTS_ASC);
    return Clients;
};

/**
 * Returns Clients with given field matching given value (convenience wrapper for simple filter).
 *
 * @param   {string}        field - Field to be matched.
 * @param   {string!number} value - Value to match against field.
 * @returns {Object[]}      Clients details.
 */
Client.getBy = function*(field, value) {
    try {

        const sql = `Select * From Client Where ${field} = ? Order By Firstname, Lastname`;

        const [Clients] = yield global.db.query(sql, value);

        return Clients;

    } catch (e) {
        switch (e.code) {
            case 'ER_BAD_FIELD_ERROR': throw ModelError(403, 'Unrecognised Client field '+field);
            default: Lib.logException('Client.getBy', e); throw ModelError(500, e.message);
        }
    }
};


/**
 * Creates new Client record.
 *
 * @param   {Object} values - Client details.
 * @returns {number} New Client id.
 * @throws  Error on validation or referential integrity errors.
 */
Client.insert = function*(values) {
    try {
        const [result] = yield global.db.query(SQL_INSERT_CLIENT, values);
        console.log('Client.insert', result.insertId, new Date); // eg audit trail?
        return result.insertId;

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


/**
 * Update Client details.
 *
 * @param  {number} id - Client id.
 * @param  {Object} values - Client details.
 * @throws Error on validation or referential integrity errors.
 */
Client.update = function*(id, values) {
    try {
        yield global.db.query(SQL_UPDATE_CLIENT, [values, id]);
        console.log('Client.update', id, new Date); // eg audit trail?

    } catch (e) {
        switch (e.code) {
            case 'ER_BAD_NULL_ERROR':
            case 'ER_DUP_ENTRY':
            case 'ER_ROW_IS_REFERENCED_': // trailing underscore?
            case 'ER_ROW_IS_REFERENCED_2':
            case 'ER_NO_REFERENCED_ROW_2':
                // recognised errors for Client.update - just use default MySQL messages for now
                throw ModelError(403, e.message); // Forbidden
            default:
                Lib.logException('Client.update', e);
                throw ModelError(500, e.message); // Internal Server Error
        }
    }
};


/**
 * Delete Client record.
 *
 * @param  {number} id - Client id.
 * @throws Error on referential integrity errors.
 */
Client.delete = function*(id) {
    try {
        yield global.db.query(SQL_DELETE_CLIENT, id);
        console.log('Client.delete', id, new Date); // eg audit trail?

    } catch (e) {
        switch (e.code) {
            case 'ER_ROW_IS_REFERENCED_': // trailing underscore?
            case 'ER_ROW_IS_REFERENCED_2':
                // related record exists in TeamClient
                throw ModelError(403, 'Client belongs to team(s)'); // Forbidden
            default:
                Lib.logException('Client.delete', e);
                throw ModelError(500, e.message); // Internal Server Error
        }
    }
};


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
