import AssertUtils from "@norjs/utils/Assert";
import { SRC_DIR } from "./test-constants";

/* global describe, it */

let PgQuery = require(`${SRC_DIR}/PgQuery.js`);
if ( PgQuery && PgQuery.default ) {
    PgQuery = PgQuery.default;
}

/* */
describe('PgQuery', () => {

    describe('#constructor', () => {

        it('is a function', () => {
            AssertUtils.isFunction(PgQuery);
        });

        it('can create an object', () => {

            const obj = new PgQuery('query', [1, 2, 3]);

            AssertUtils.isObject(obj);

        });

    });

    describe('#queryString', () => {

        it('can be accessed', () => {

            const obj = new PgQuery('query', [1, 2, 3]);

            AssertUtils.isEqual(obj.queryString, 'query');

        });

    });

    describe('#queryValues', () => {

        it('can be accessed', () => {

            const obj = new PgQuery('query', [1, 2, 3]);

            AssertUtils.isArray(obj.queryValues);
            AssertUtils.isEqual(obj.queryValues.length, 3);
            AssertUtils.isEqual(obj.queryValues[0], 1);
            AssertUtils.isEqual(obj.queryValues[1], 2);
            AssertUtils.isEqual(obj.queryValues[2], 3);

        });

    });

});

