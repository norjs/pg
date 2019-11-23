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

    describe('#createUpdateQuery', () => {

        it('can create an update query with single properties', () => {

            const where = {
                id: 1234
            };

            const value = {
                bar: "foobar"
            };

            const query = PgQueryUtils.createUpdateQuery(TEST_TABLE, where, value);

            AssertUtils.isInstanceOf(query, PgQueryUtils.PgQuery);

            AssertUtils.isEqual(query.queryString, `UPDATE "test_account" SET bar = $1 WHERE id = $2 RETURNING *`);
            AssertUtils.isArray(query.queryValues);
            AssertUtils.isEqual(query.queryValues.length, 2);

            AssertUtils.isEqual(query.queryValues[0], "foobar"); // foo
            AssertUtils.isEqual(query.queryValues[1], 1234);   // bar

        });

        it('can create an update query with multiple properties', () => {

            const where = {
                id: 1234,
                deleted: false
            };

            const value = {
                bar: "foobar",
                foo: true
            };

            const query = PgQueryUtils.createUpdateQuery(TEST_TABLE, where, value);

            AssertUtils.isInstanceOf(query, PgQueryUtils.PgQuery);

            AssertUtils.isEqual(query.queryString, `UPDATE "test_account" SET bar = $1, foo = $2 WHERE id = $3 AND deleted = $4 RETURNING *`);
            AssertUtils.isArray(query.queryValues);
            AssertUtils.isEqual(query.queryValues.length, 4);

            AssertUtils.isEqual(query.queryValues[0], "foobar"); // bar
            AssertUtils.isEqual(query.queryValues[1], true);    // foo
            AssertUtils.isEqual(query.queryValues[2], 1234);     // id
            AssertUtils.isEqual(query.queryValues[3], false);    // deleted

        });

        it('can create a shortened update query', () => {

            const where = {
                id: 1234,
                deleted: false
            };

            const value = {
                bar: "foobar",
                foo: false
            };

            const query = PgQueryUtils.createUpdateQuery(TEST_TABLE, where, value);

            AssertUtils.isInstanceOf(query, PgQueryUtils.PgQuery);

            AssertUtils.isEqual(query.queryString, `UPDATE "test_account" SET bar = $1, foo = $2 WHERE id = $3 AND deleted = $2 RETURNING *`);
            AssertUtils.isArray(query.queryValues);
            AssertUtils.isEqual(query.queryValues.length, 3);

            AssertUtils.isEqual(query.queryValues[0], "foobar"); // $1: bar
            AssertUtils.isEqual(query.queryValues[1], false);    // $2: foo & deleted
            AssertUtils.isEqual(query.queryValues[2], 1234);     // $3: id

        });

        it('can create an update query with bindings', () => {

            const where = {
                id: 1234,
                deleted: false
            };

            const value = {
                bar: "foobar",
                foo: false
            };

            const bindings = {
                test_bar: "bar",
                test_foo: "foo"
            };

            const query = PgQueryUtils.createUpdateQuery(TEST_TABLE, where, value, bindings);

            AssertUtils.isInstanceOf(query, PgQueryUtils.PgQuery);

            AssertUtils.isEqual(query.queryString, `UPDATE "test_account" SET test_bar = $1, test_foo = $2 WHERE id = $3 AND deleted = $2 RETURNING *`);
            AssertUtils.isArray(query.queryValues);
            AssertUtils.isEqual(query.queryValues.length, 3);

            AssertUtils.isEqual(query.queryValues[0], "foobar"); // $1: bar
            AssertUtils.isEqual(query.queryValues[1], false);    // $2: foo & deleted
            AssertUtils.isEqual(query.queryValues[2], 1234);     // $3: id

        });

        it('can create an update query with subset using bindings', () => {

            const where = {
                id: 1234
            };

            const value = {
                foo: "title",
                bar: "foobar",
                deleted: false,
                created: "2019-10-01"
            };

            const bindings = {
                test_bar: "bar",
                test_foo: "foo"
            };

            const query = PgQueryUtils.createUpdateQuery(TEST_TABLE, where, value, bindings);

            AssertUtils.isInstanceOf(query, PgQueryUtils.PgQuery);

            AssertUtils.isEqual(query.queryString, `UPDATE "test_account" SET test_bar = $1, test_foo = $2 WHERE id = $3 RETURNING *`);
            AssertUtils.isArray(query.queryValues);
            AssertUtils.isEqual(query.queryValues.length, 3);

            AssertUtils.isEqual(query.queryValues[0], "foobar");  // $1: bar
            AssertUtils.isEqual(query.queryValues[1], "title");   // $2: foo
            AssertUtils.isEqual(query.queryValues[2], 1234);      // $3: id

        });

        it('can create an update query with missing bindings', () => {

            const where = {
                id: 1234
            };

            const value = {
                bar: "foobar",
                deleted: false,
                created: "2019-10-01"
            };

            const bindings = {
                test_bar: "bar",
                test_foo: "foo"
            };

            const query = PgQueryUtils.createUpdateQuery(TEST_TABLE, where, value, bindings);

            AssertUtils.isInstanceOf(query, PgQueryUtils.PgQuery);

            AssertUtils.isEqual(query.queryString, `UPDATE "test_account" SET test_bar = $1, test_foo = $2 WHERE id = $3 RETURNING *`);
            AssertUtils.isArray(query.queryValues);
            AssertUtils.isEqual(query.queryValues.length, 3);

            AssertUtils.isEqual(query.queryValues[0], "foobar");  // $1: bar
            AssertUtils.isNull(query.queryValues[1]);   // $2: foo
            AssertUtils.isEqual(query.queryValues[2], 1234);      // $3: id

        });

        it('can create an update query with NOW symbol', () => {

            const where = {
                id: 1234
            };

            const values = {
                bar: "foobar",
                created: PgQueryUtils.Symbol.NOW
            };

            const query = PgQueryUtils.createUpdateQuery(TEST_TABLE, where, values);

            AssertUtils.isInstanceOf(query, PgQueryUtils.PgQuery);

            AssertUtils.isEqual(query.queryString, `UPDATE "test_account" SET bar = $1, created = NOW() WHERE id = $2 RETURNING *`);
            AssertUtils.isArray(query.queryValues);
            AssertUtils.isEqual(query.queryValues.length, 2);

            AssertUtils.isEqual(query.queryValues[0], "foobar"); // $1: bar
            AssertUtils.isEqual(query.queryValues[1], 1234);    // $2: id

        });

        it('can create an update query with NOW symbol using bindings', () => {

            const where = {
                id: 1234
            };

            const values = {
                bar: "foobar",
                created: PgQueryUtils.Symbol.NOW
            };

            const bindings = {
                test_bar: "bar",
                test_created: "created"
            };

            const query = PgQueryUtils.createUpdateQuery(TEST_TABLE, where, values, bindings);

            AssertUtils.isInstanceOf(query, PgQueryUtils.PgQuery);

            AssertUtils.isEqual(query.queryString, `UPDATE "test_account" SET test_bar = $1, test_created = NOW() WHERE id = $2 RETURNING *`);
            AssertUtils.isArray(query.queryValues);
            AssertUtils.isEqual(query.queryValues.length, 2);

            AssertUtils.isEqual(query.queryValues[0], "foobar"); // $1: bar
            AssertUtils.isEqual(query.queryValues[1], 1234);    // $2: id

        });

        it('can create an update query with INCREASE symbol', () => {

            const where = {
                id: 1234
            };

            const values = {
                bar: "foobar",
                version: PgQueryUtils.Symbol.INCREASE
            };

            const query = PgQueryUtils.createUpdateQuery(TEST_TABLE, where, values);

            AssertUtils.isInstanceOf(query, PgQueryUtils.PgQuery);

            AssertUtils.isEqual(query.queryString, `UPDATE "test_account" SET bar = $1, version = version + 1 WHERE id = $2 RETURNING *`);
            AssertUtils.isArray(query.queryValues);
            AssertUtils.isEqual(query.queryValues.length, 2);

            AssertUtils.isEqual(query.queryValues[0], "foobar"); // $1: bar
            AssertUtils.isEqual(query.queryValues[1], 1234);    // $2: id

        });

        it('can create an update query with INCREASE symbol using bindings', () => {

            const where = {
                id: 1234
            };

            const values = {
                bar: "foobar",
                version: PgQueryUtils.Symbol.INCREASE
            };

            const bindings = {
                test_bar: "bar",
                test_version: "version"
            };

            const query = PgQueryUtils.createUpdateQuery(TEST_TABLE, where, values, bindings);

            AssertUtils.isInstanceOf(query, PgQueryUtils.PgQuery);

            AssertUtils.isEqual(query.queryString, `UPDATE "test_account" SET test_bar = $1, test_version = test_version + 1 WHERE id = $2 RETURNING *`);
            AssertUtils.isArray(query.queryValues);
            AssertUtils.isEqual(query.queryValues.length, 2);

            AssertUtils.isEqual(query.queryValues[0], "foobar"); // $1: bar
            AssertUtils.isEqual(query.queryValues[1], 1234);    // $2: id

        });

    });

    describe('#createSelectQuery', () => {

        it('can create an select query with single where condition', () => {

            const where = {
                id: 1234
            };

            const query = PgQueryUtils.createSelectQuery(TEST_TABLE, where);

            AssertUtils.isInstanceOf(query, PgQueryUtils.PgQuery);

            AssertUtils.isEqual(query.queryString, `SELECT * FROM "test_account" WHERE id = $1`);

            AssertUtils.isArray(query.queryValues);
            AssertUtils.isEqual(query.queryValues.length, 1);

            AssertUtils.isEqual(query.queryValues[0], 1234);   // $1: id

        });

        it('can create an select query with multiple where conditions', () => {

            const where = {
                id: 1234,
                deleted: false
            };

            const query = PgQueryUtils.createSelectQuery(TEST_TABLE, where);

            AssertUtils.isInstanceOf(query, PgQueryUtils.PgQuery);

            AssertUtils.isEqual(query.queryString, `SELECT * FROM "test_account" WHERE id = $1 AND deleted = $2`);

            AssertUtils.isArray(query.queryValues);
            AssertUtils.isEqual(query.queryValues.length, 2);

            AssertUtils.isEqual(query.queryValues[0], 1234);   // $1: id
            AssertUtils.isEqual(query.queryValues[1], false);  // $2: deleted

        });

        it('can create an select query with re-used where conditions', () => {

            const where = {
                id: 1234,
                deleted: false,
                archived: false
            };

            const query = PgQueryUtils.createSelectQuery(TEST_TABLE, where);

            AssertUtils.isInstanceOf(query, PgQueryUtils.PgQuery);

            AssertUtils.isEqual(query.queryString, `SELECT * FROM "test_account" WHERE id = $1 AND deleted = $2 AND archived = $2`);

            AssertUtils.isArray(query.queryValues);
            AssertUtils.isEqual(query.queryValues.length, 2);

            AssertUtils.isEqual(query.queryValues[0], 1234);   // $1: id
            AssertUtils.isEqual(query.queryValues[1], false);  // $2: deleted & archived

        });

    });

});

