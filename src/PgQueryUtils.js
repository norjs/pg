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
     * @param [bindings] {Object.<string, string>|undefined} Optional bindings between the table keyword and value
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

        const queryString = `INSERT INTO "${table}" (${ queryKeys.join(', ') }) VALUES ${ _.map(queryPlaceholders, item => `(${item.join(',')})`).join(',') } RETURNING *`;

        nrLog.debug(`.createInsertQuery(): queryString = `, queryString);
        nrLog.debug(`.createInsertQuery(): queryValues = `, queryValues);

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
