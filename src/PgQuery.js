
export class PgQuery {

    /**
     *
     * @param queryString {string}
     * @param queryValues {Array.<*>}
     */
    constructor (queryString, queryValues) {

        this._queryString = queryString;

        this._queryValues = queryValues;

    }

    /**
     *
     * @returns {string}
     */
    get queryString () {
        return this._queryString;
    }

    /**
     *
     * @returns {Array<*>}
     */
    get queryValues () {
        return this._queryValues;
    }

}

export default PgQuery;
