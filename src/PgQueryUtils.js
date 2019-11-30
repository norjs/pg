import _ from 'lodash';
import LogUtils from "@norjs/utils/src/LogUtils";
import PgQuery from "./PgQuery";
import AssertUtils from "@norjs/utils/src/AssertUtils";
import { PgQuerySymbol } from "./PgQuerySymbol";
import { PgSelectOptions } from "./PgSelectOptions";
import { PgOperator } from "./PgOperator";
import { PgOperatorFormat } from "./PgOperatorFormat";
import StringUtils from "@norjs/utils/src/StringUtils";

const MODULE_NAME = 'PgQueryUtils';

const OP_KEYS = _.keys(PgOperator);
const OP_VALUES = _.map(OP_KEYS, key => PgOperator[key]);
const OP_FORMATS = _.map(OP_KEYS, key => PgOperatorFormat[key]);

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
     * @returns {typeof PgSelectOptions}
     */
    static get SelectOptions () {
        return PgSelectOptions;
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

        const whereList = this._parseWhereList(queryValues, where);

        // FIXME: Escape table name
        let queryString = `UPDATE "${table}" SET ${ sets.join(', ') }`;

        if ( whereList && whereList.length ) {
            queryString += ` WHERE ${ whereList.join(' AND ') }`;
        }

        queryString += ` RETURNING *`;

        return new PgQuery(queryString, queryValues);

    }

    /**
     *
     * @param table {string} The table name
     * @param [where] {Object.<string, string|Symbol>|PgSelectOptions|undefined} Which rows to match
     * @param [options] {PgSelectOptions|undefined}
     * @returns {PgQuery}
     * @fixme Keyword names should be escaped
     */
    static createSelectQuery (table, where = undefined, options = undefined) {

        if ( where instanceof PgSelectOptions ) {

            AssertUtils.isUndefined(options);

            options = where;

            where = options.where;

        } else {

            if ( options === undefined ) {
                options = new PgSelectOptions();
            }

            options.setWhere(where);

        }

        AssertUtils.isString(table);
        if (where !== undefined) AssertUtils.isObject(where);
        AssertUtils.isInstanceOf(options, PgSelectOptions);

        const queryValues = [];

        const whereList = this._parseWhereList(queryValues, where);

        // FIXME: Escape table name
        let queryString = `SELECT * FROM "${table}"`;

        if ( whereList && whereList.length ) {
            queryString += ` WHERE ${ whereList.join(' AND ') }`;
        }

        const orderBy = options.orderBy;
        if ( orderBy && orderBy.length ) {
            queryString += ` ORDER BY ${ orderBy.join(', ') }`;
        }

        const limit = options.limit;
        if ( limit !== undefined ) {
            queryString += ` LIMIT ${ limit }`;
        }

        return new PgQuery(queryString, queryValues);

    }

    /**
     *
     * @param queryValues {Array.<*>}
     * @param where {WhereObject|undefined}
     * @returns {any}
     * @private
     */
    static _parseWhereList (queryValues, where) {

        return where !== undefined ? _.map(Object.keys(where), key => {

            const value = where[key];

            if ( value === PgQuerySymbol.NOW ) {
                return `${key} = NOW()`;
            }

            if ( _.isArray(value) ) {

                if (value.length === 0) {
                    throw new TypeError(`${this.nrName}._parseWhereList(): array value was empty`);
                }

                const operator = value.shift();

                AssertUtils.isString(operator);

                const index = OP_VALUES.indexOf(operator);
                if (index < 0) {
                    throw new TypeError(`${this.nrName}._parseWhereList(): Unknown operator: "${operator}"`);
                }

                const opFormat = OP_FORMATS[index];

                const paramPlaceholders = _.concat(
                    [
                        `${key}`
                    ],
                    _.map(value, v => {

                        const valueIndex = queryValues.indexOf(v);

                        if (valueIndex >= 0) {
                            return `$${valueIndex + 1}`;
                        }

                        queryValues.push(v);

                        return `$${queryValues.length}`;

                    })

                );

                return StringUtils.strictFormatStringWithArray(opFormat, paramPlaceholders);

            }

            const valueIndex = queryValues.indexOf(value);

            if (valueIndex >= 0) {
                return `${key} = $${valueIndex + 1}`;
            }

            queryValues.push(value);

            return `${key} = $${queryValues.length}`;

        }) : undefined;

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
