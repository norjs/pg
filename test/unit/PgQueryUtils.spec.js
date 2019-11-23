import AssertUtils from "@norjs/utils/Assert";
import LogUtils from "@norjs/utils/Log";
import { SRC_DIR, TEST_TABLE } from "./test-constants";

/* global describe, it */

let PgQueryUtils = require(`${SRC_DIR}/PgQueryUtils.js`);
if ( PgQueryUtils && PgQueryUtils.default ) {
    PgQueryUtils = PgQueryUtils.default;
}

const TEST_SUBJECT_NAME = 'PgQueryUtils';

PgQueryUtils.setLogLevel(LogUtils.Logger.LogLevel.WARN);

/* */
describe(TEST_SUBJECT_NAME, () => {

    describe('#nrName', () => {

        it('is a correct name', () => {

            AssertUtils.isEqual(PgQueryUtils.nrName, TEST_SUBJECT_NAME);

        });

    });

    describe('#PgQuery', () => {

        it('is a function', () => {

            AssertUtils.isFunction(PgQueryUtils.PgQuery);

        });

    });

    describe('#createInsertQuery', () => {

        it('can create a query for single value', () => {

            const values = [{
                foo: '123',
                bar: 123,
                enabled: false
            }];

            const query = PgQueryUtils.createInsertQuery(TEST_TABLE, values);

            AssertUtils.isInstanceOf(query, PgQueryUtils.PgQuery);

            AssertUtils.isEqual(query.queryString, `INSERT INTO "test_account" (foo, bar, enabled) VALUES ($1,$2,$3) RETURNING *`);
            AssertUtils.isArray(query.queryValues);
            AssertUtils.isEqual(query.queryValues.length, 3);

            AssertUtils.isEqual(query.queryValues[0], "123"); // foo
            AssertUtils.isEqual(query.queryValues[1], 123);   // bar
            AssertUtils.isEqual(query.queryValues[2], false); // enabled

        });

        it('can create a query for single value with bindings', () => {

            const values = [{
                foo: '123',
                bar: 123,
                enabled: false
            }];

            const query = PgQueryUtils.createInsertQuery(TEST_TABLE, values, {
                test_foo: 'foo',
                test_bar: 'bar',
                test_enabled: 'enabled'
            });

            AssertUtils.isInstanceOf(query, PgQueryUtils.PgQuery);

            AssertUtils.isEqual(query.queryString, `INSERT INTO "test_account" (test_foo, test_bar, test_enabled) VALUES ($1,$2,$3) RETURNING *`);
            AssertUtils.isArray(query.queryValues);
            AssertUtils.isEqual(query.queryValues.length, 3);

            AssertUtils.isEqual(query.queryValues[0], "123"); // test_foo
            AssertUtils.isEqual(query.queryValues[1], 123);   // test_bar
            AssertUtils.isEqual(query.queryValues[2], false); // test_enabled

        });

        it('can create a query for single value with limited bindings', () => {

            const values = [{
                foo: '123',
                bar: 123,
                enabled: false
            }];

            const query = PgQueryUtils.createInsertQuery(TEST_TABLE, values, {
                test_foo: 'foo',
                test_enabled: 'enabled'
            });

            AssertUtils.isInstanceOf(query, PgQueryUtils.PgQuery);

            AssertUtils.isEqual(query.queryString, `INSERT INTO "test_account" (test_foo, test_enabled) VALUES ($1,$2) RETURNING *`);
            AssertUtils.isArray(query.queryValues);
            AssertUtils.isEqual(query.queryValues.length, 2);
            AssertUtils.isEqual(query.queryValues[0], "123"); // test_foo
            AssertUtils.isEqual(query.queryValues[1], false); // test_enabled

        });

        it('can create a query for single value with missing extra bindings', () => {

            const values = [{
                foo: '123',
                enabled: false
            }];

            const query = PgQueryUtils.createInsertQuery(TEST_TABLE, values, {
                test_foo: 'foo',
                test_bar: 'bar',
                test_enabled: 'enabled'
            });

            AssertUtils.isInstanceOf(query, PgQueryUtils.PgQuery);

            AssertUtils.isEqual(query.queryString, `INSERT INTO "test_account" (test_foo, test_enabled) VALUES ($1,$2) RETURNING *`);
            AssertUtils.isArray(query.queryValues);
            AssertUtils.isEqual(query.queryValues.length, 2);

            AssertUtils.isEqual(query.queryValues[0], "123"); // test_foo
            AssertUtils.isEqual(query.queryValues[1], false); // test_enabled

        });

        it('can create a query for single value with some missing extra bindings', () => {

            const values = [
                {
                    foo: '123',
                    enabled: false
                },
                {
                    foo: '654',
                    bar: 123,
                    enabled: true
                }
            ];

            const query = PgQueryUtils.createInsertQuery(TEST_TABLE, values, {
                test_foo: 'foo',
                test_bar: 'bar',
                test_enabled: 'enabled'
            });

            AssertUtils.isInstanceOf(query, PgQueryUtils.PgQuery);

            AssertUtils.isEqual(query.queryString, `INSERT INTO "test_account" (test_foo, test_enabled, test_bar) VALUES ($1,$2,$3),($4,$5,$6) RETURNING *`);
            AssertUtils.isArray(query.queryValues);
            AssertUtils.isEqual(query.queryValues.length, 6);

            AssertUtils.isEqual(query.queryValues[0], "123"); // test_foo
            AssertUtils.isEqual(query.queryValues[1], false); // test_enabled
            AssertUtils.isNull(query.queryValues[2]);                  // test_bar

            AssertUtils.isEqual(query.queryValues[3], "654"); // test_foo
            AssertUtils.isEqual(query.queryValues[5], 123);   // test_enabled
            AssertUtils.isEqual(query.queryValues[4], true);  // test_bar

        });

        it('can reuse unique values for single value', () => {

            const values = [{
                foo: 123,
                bar: 123,
                enabled: false
            }];

            const query = PgQueryUtils.createInsertQuery(TEST_TABLE, values);

            AssertUtils.isInstanceOf(query, PgQueryUtils.PgQuery);

            AssertUtils.isEqual(query.queryString, `INSERT INTO "test_account" (foo, bar, enabled) VALUES ($1,$1,$2) RETURNING *`);
            AssertUtils.isArray(query.queryValues);
            AssertUtils.isEqual(query.queryValues.length, 2);

            AssertUtils.isEqual(query.queryValues[0], 123);   // foo & bar
            AssertUtils.isEqual(query.queryValues[1], false); // enabled

        });

        it('can create a query for multiple values', () => {

            const values = [
                {
                    foo: '123',
                    bar: 123,
                    enabled: false
                },
                {
                    foo: '456',
                    bar: 456,
                    enabled: true
                }
            ];

            const query = PgQueryUtils.createInsertQuery(TEST_TABLE, values);

            AssertUtils.isInstanceOf(query, PgQueryUtils.PgQuery);

            AssertUtils.isEqual(query.queryString, `INSERT INTO "test_account" (foo, bar, enabled) VALUES ($1,$2,$3),($4,$5,$6) RETURNING *`);
            AssertUtils.isArray(query.queryValues);
            AssertUtils.isEqual(query.queryValues.length, 6);

            AssertUtils.isEqual(query.queryValues[0], "123"); // foo
            AssertUtils.isEqual(query.queryValues[1], 123);   // bar
            AssertUtils.isEqual(query.queryValues[2], false); // enabled

            AssertUtils.isEqual(query.queryValues[3], "456"); // foo
            AssertUtils.isEqual(query.queryValues[4], 456);   // bar
            AssertUtils.isEqual(query.queryValues[5], true);  // enabled

        });

        it('can reuse unique values for multiple values', () => {

            const value1 = {
                foo: '123',
                bar: 123,
                enabled: false
            };

            const value2 = {
                foo: '456',
                bar: 123,
                enabled: true
            };

            const value3 = {
                foo: '456',
                bar: 654,
                enabled: true
            };

            const value4 = {
                foo: '123',
                bar: 34,
                enabled: false
            };

            const values = [
                value1,
                value4,
                value3,
                value2,
                value2,
                value1,
                value4,
                value3
            ];

            const query = PgQueryUtils.createInsertQuery(TEST_TABLE, values);

            AssertUtils.isInstanceOf(query, PgQueryUtils.PgQuery);

            AssertUtils.isEqual(query.queryString, `INSERT INTO "test_account" (foo, bar, enabled) VALUES ($1,$2,$3),($1,$4,$3),($5,$6,$7),($5,$2,$7),($5,$2,$7),($1,$2,$3),($1,$4,$3),($5,$6,$7) RETURNING *`);
            AssertUtils.isArray(query.queryValues);
            AssertUtils.isEqual(query.queryValues.length, 7);

            AssertUtils.isEqual(query.queryValues[0], "123"); // foo
            AssertUtils.isEqual(query.queryValues[1], 123);   // bar
            AssertUtils.isEqual(query.queryValues[2], false); // enabled

            AssertUtils.isEqual(query.queryValues[3], 34);    // bar

            AssertUtils.isEqual(query.queryValues[4], "456"); // foo
            AssertUtils.isEqual(query.queryValues[5], 654);   // bar
            AssertUtils.isEqual(query.queryValues[6], true);  // enabled

        });

        it('can create a query with NOW symbol', () => {

            const values = [{
                foo: '123',
                created: PgQueryUtils.Symbol.NOW,
                enabled: false
            }];

            const query = PgQueryUtils.createInsertQuery(TEST_TABLE, values);

            AssertUtils.isInstanceOf(query, PgQueryUtils.PgQuery);

            AssertUtils.isEqual(query.queryString, `INSERT INTO "test_account" (foo, created, enabled) VALUES ($1,NOW(),$2) RETURNING *`);
            AssertUtils.isArray(query.queryValues);
            AssertUtils.isEqual(query.queryValues.length, 2);

            AssertUtils.isEqual(query.queryValues[0], "123"); // foo
            AssertUtils.isEqual(query.queryValues[1], false); // enabled

        });

    });

});

