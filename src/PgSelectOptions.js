import AssertUtils from "@norjs/utils/Assert";

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
         * @member {Object<string, string>|undefined}
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
     * @returns {Object<string, string>|undefined}
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
     * @param where {Object<string, string>|undefined}
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
