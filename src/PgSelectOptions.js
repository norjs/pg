import AssertUtils from "@norjs/utils/Assert";

/**
 * This is an object which configures a WHERE clause.
 *
 * The property keyword is the field name.
 *
 * The property value is either:
 *
 *   1) a strict value (string, boolean, number, null, undefined) to match for, or
 *
 *   2) a special symbol with special meaning,
 *
 *   3)
 *
 * @typedef {Object<string, string|boolean|number|null|undefined|symbol|array>} WhereObject
 */

/**
 *
 * FIXME: Implement support for LIMIT/OFFSET
 */
export class PgSelectOptions {

    /**
     *
     */
    constructor () {

        /**
         *
         * @member {WhereObject|undefined}
         * @private
         */
        this._where = undefined;

        /**
         *
         * @member {Array.<string>|undefined}
         * @private
         */
        this._orderBy = undefined;

    }

    /**
     *
     * @returns {WhereObject|undefined}
     */
    get where () {
        return this._where;
    }

    /**
     *
     * @returns {Array<string>|undefined}
     */
    get orderBy () {
        return this._orderBy;
    }

    /**
     *
     * @param where {WhereObject|undefined}
     */
    setWhere (where) {

        if (where !== undefined) AssertUtils.isObject(where);

        this._where = where;

    }

    /**
     *
     * @param orderBy {Array.<string>|undefined}
     */
    setOrderBy (orderBy) {

        if (orderBy !== undefined) AssertUtils.isArray(orderBy);

        this._orderBy = orderBy;

    }

}

export default PgSelectOptions;
