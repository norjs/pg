import _ from 'lodash';
import LogUtils from "@norjs/utils/src/LogUtils";
import PgQuery from "./PgQuery";
import AssertUtils from "@norjs/utils/src/AssertUtils";
import { PgQuerySymbol } from "./PgQuerySymbol";

const MODULE_NAME = 'PgQueryUtils';

const nrLog = LogUtils.getLogger(MODULE_NAME);

/**
 *
 */
export class PgQueryUtils {

    /**
     *
     * @param level {LogLevel|string}
     */
    static setLogLevel (level) {
        nrLog.setLogLevel(level);
    }

    /**
     *
     * @returns {string}
     */
    static get nrName () {
        return MODULE_NAME;
    }

    /**
     *
     * @returns {typeof PgQuery}
     */
    static get PgQuery () {
        return PgQuery;
    }

    /**
     *
     * @returns {typeof PgQuerySymbol}
     */
    static get Symbol () {
        return PgQuerySymbol;
    }

    /**
     * @private
     */
    constructor () {}

    /**
     *
     * @param table {string} The table name
     * @param values {Array.<Object>} Values to insert to the table
     * @param [bindings] {Object.<string, string>|undefined} Optional bindings between the table keyword and value property
     * @returns {PgQuery}
     */
    static createInsertQuery (table, values, bindings = undefined) {

        AssertUtils.isString(table);
        AssertUtils.isArray(values);
        if (bindings !== undefined) AssertUtils.isObject(bindings);

        /**
         * This array contains every unique field keyword from all value objects
         *
         * @type {Array.<string>}
         */
        let queryKeys = [];

        // Populate unique queryKeys
        if (bindings !== undefined) {

            _.forEach(values, objValue => {

                AssertUtils.isObject(objValue);

                _.forEach(Object.keys(bindings), bindingKey => {

                    const valueKey = bindings[bindingKey];

                    if (_.has(objValue, valueKey)) {

                        if ( queryKeys.indexOf(bindingKey) < 0 ) {
                            queryKeys.push(bindingKey);
                        }

                    }

                });

            });

        } else {

            _.forEach(values, objValue => {

                AssertUtils.isObject(objValue);

                _.forEach(Object.keys(objValue), key => {

                    if ( queryKeys.indexOf(key) < 0 ) {
                        queryKeys.push(key);
                    }

                });

            });

        }

        /**
         * This array contains all the values matching queryPlaceholders
         *
         * @type {Array.<*>}
         */
        let queryValues = [];

        /**
         * This array contains all the query placeholder variables going into the query.
         *
         * @type {Array.<Array.<string>>}
         */
        let queryPlaceholders = _.map(values, objValue => {

            return _.map(queryKeys, key => {

                const valueKey = bindings ? bindings[key] : key;

                const value = _.get(objValue, valueKey, null);

                if ( value === PgQuerySymbol.NOW ) {
                    return 'NOW()';
                }

                const valueIndex = queryValues.indexOf(value);

                if (valueIndex >= 0) {
                    return `$${ valueIndex + 1 }`;
                }

                const placeholder = `$${ queryValues.length + 1 }`;

                queryValues.push(value);

                return placeholder;

            });

        });

        // FIXME: Escape table and/or queryKeys
        const queryString = `INSERT INTO "${table}" (${ queryKeys.join(', ') }) VALUES ${ _.map(queryPlaceholders, item => `(${item.join(',')})`).join(',') } RETURNING *`;

        nrLog.trace(`${this.nrName}.createInsertQuery(): queryString = `, queryString);
        nrLog.trace(`${this.nrName}.createInsertQuery(): queryValues = `, queryValues);

        return new PgQuery(queryString, queryValues);

    }

    /**
     *
     * @param table {string} The table name
     * @param where {Object.<string, string|Symbol>} Which rows to match
     * @param changes {Object} New properties to update to the row
     * @param [bindings] {Object.<string, string>|undefined} Optional bindings between the table keyword and value property
     * @returns {PgQuery}
     * @fixme Keyword names should be escaped
     */
    static createUpdateQuery (table, where, changes, bindings = undefined) {

        const queryValues = [];

        let sets = undefined;

        if (bindings !== undefined) {

            sets = _.map(Object.keys(bindings), bindingKey => {

                const key = bindings[bindingKey];

                const value = _.get(changes, key, null);

                if ( value === PgQuerySymbol.NOW ) {
                    return `${bindingKey} = NOW()`;
                }

                if ( value === PgQuerySymbol.INCREASE ) {
                    return `${bindingKey} = ${bindingKey} + 1`;
                }

                const valueIndex = queryValues.indexOf(value);

                if ( valueIndex >= 0 ) {
                    return `${bindingKey} = $${ valueIndex + 1 }`;
                }

                queryValues.push(value);

                return `${bindingKey} = $${ queryValues.length }`;

            });

        } else {

            sets = _.map(Object.keys(changes), key => {

                const value = changes[key];

                if ( value === PgQuerySymbol.NOW ) {
                    return `${key} = NOW()`;
                }

                if ( value === PgQuerySymbol.INCREASE ) {
                    return `${key} = ${key} + 1`;
                }

                const valueIndex = queryValues.indexOf(value);

                if ( valueIndex >= 0 ) {
                    return `${key} = $${ valueIndex + 1 }`;
                }

                queryValues.push(value);

                return `${key} = $${ queryValues.length }`;


            });

        }

        const whereList = _.map(Object.keys(where), key => {

            const value = where[key];

            if ( value === PgQuerySymbol.NOW ) {
                return `${key} = NOW()`;
            }

            const valueIndex = queryValues.indexOf(value);

            if (valueIndex >= 0) {
                return `${key} = $${valueIndex + 1}`;
            }

            queryValues.push(value);

            return `${key} = $${queryValues.length}`;

        });

        // FIXME: Escape table name
        const queryString = `UPDATE "${table}" SET ${ sets.join(', ') } WHERE ${ whereList.join(' AND ') } RETURNING *`;

        return new PgQuery(queryString, queryValues);

    }

    /**
     *
     * @param table {string} The table name
     * @param where {Object.<string, string|Symbol>} Which rows to match
     * @returns {PgQuery}
     * @fixme Keyword names should be escaped
     */
    static createSelectQuery (table, where) {

        const queryValues = [];

        const whereList = _.map(Object.keys(where), key => {

            const value = where[key];

            if ( value === PgQuerySymbol.NOW ) {
                return `${key} = NOW()`;
            }

            const valueIndex = queryValues.indexOf(value);

            if (valueIndex >= 0) {
                return `${key} = $${valueIndex + 1}`;
            }

            queryValues.push(value);

            return `${key} = $${queryValues.length}`;

        });

        // FIXME: Escape table name
        const queryString = `SELECT * FROM "${table}" WHERE ${ whereList.join(' AND ') }`;

        return new PgQuery(queryString, queryValues);

    }

    /**
     * Note! Intentionally not using _.has() here because it's not the same thing (it would test sub paths too).
     *
     * @param obj {Object}
     * @param key {string}
     * @returns {boolean}
     * @private
     */
    static _has (obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
    }

}

export default PgQueryUtils;
