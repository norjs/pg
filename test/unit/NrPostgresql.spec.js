import AssertUtils from "@norjs/utils/Assert";
import { TEST_TABLE, TEST_TIMEOUT, PGCONFIG, SRC_DIR, ENABLE_PGCONFIG } from "./test-constants";

/* global describe, it */

let NrPostgresql = require(`${SRC_DIR}/NrPostgresql.js`);

if ( NrPostgresql && NrPostgresql.default ) {
	NrPostgresql = NrPostgresql.default;
}

/* */
describe('NrPostgresql', function(){

	if (ENABLE_PGCONFIG) {

		if ( TEST_TIMEOUT >= 2000 ) {
			this.timeout(TEST_TIMEOUT);
		}

	} else {

		console.warn(`Warning! Some tests disabled because PostgreSQL was not configured. Setup PGCONFIG and/or see ./run-tests.sh.`);

	}

	describe('#connect', () => {

		it('is callable', () => {
			AssertUtils.isFunction(NrPostgresql);
			AssertUtils.isFunction(NrPostgresql.connect);
		});

	});

	describe('#start', () => {

		it('is callable', () => {
			AssertUtils.isFunction(NrPostgresql);
			AssertUtils.isFunction(NrPostgresql.start);
		});

		if (ENABLE_PGCONFIG) {

			it('can query rows', async () => {

				let db = await NrPostgresql.start(PGCONFIG);

				db = await db.query(`SELECT * FROM "${TEST_TABLE}"`);

				AssertUtils.isObject(db);
				AssertUtils.isCallable(db.fetch);

				const rows = db.fetch();
				AssertUtils.isArray(rows);
				AssertUtils.isEqual(rows.length, 3);

				AssertUtils.isObject(rows[0]);
				AssertUtils.isEqual(rows[0].username, "foo1");
				AssertUtils.isEqual(rows[0].password, "bar1");
				AssertUtils.isEqual(rows[0].created.getTime(), 1403211600000);

				AssertUtils.isObject(rows[1]);
				AssertUtils.isEqual(rows[1].username, "foo2");
				AssertUtils.isEqual(rows[1].password, "bar2");
				AssertUtils.isEqual(rows[1].created.getTime(), 1543701600000);

				AssertUtils.isObject(rows[2]);
				AssertUtils.isEqual(rows[2].username, "foo3");
				AssertUtils.isEqual(rows[2].password, "bar3");
				AssertUtils.isEqual(rows[2].created.getTime(), 1547071200000);

				await db.commit();

			});

		}

	});

	describe('#insert', () => {

		it('is callable', () => {
			AssertUtils.isFunction(NrPostgresql);
			AssertUtils.isFunction(NrPostgresql.insert);
		});

		if (ENABLE_PGCONFIG) {

			it('can insert rows', async () => {

				const values = [
					{
						username: "admin@example.com",
						password: "foobar1",
						created: NrPostgresql.Symbol.NOW
					}
				];

				let rows = await NrPostgresql.insert(PGCONFIG, TEST_TABLE, values);

				AssertUtils.isArray(rows);
				AssertUtils.isEqual(rows.length, 1);
				AssertUtils.isEqual(rows[0].username, "admin@example.com");
				AssertUtils.isEqual(rows[0].password, "foobar1");
				AssertUtils.isDate(rows[0].created);

			});

		}

	});

	describe('#update', () => {

		it('is callable', () => {
			AssertUtils.isFunction(NrPostgresql);
			AssertUtils.isFunction(NrPostgresql.update);
		});

		if (ENABLE_PGCONFIG) {

			it('can update rows', async () => {

				const where = {
					username: 'foo2'
				};

				const changes = {
					password: "bar999"
				};

				let rows = await NrPostgresql.update(PGCONFIG, TEST_TABLE, where, changes);

				AssertUtils.isArray(rows);
				AssertUtils.isEqual(rows.length, 1);
				AssertUtils.isEqual(rows[0].username, "foo2");
				AssertUtils.isEqual(rows[0].password, "bar999");
				AssertUtils.isDate(rows[0].created);

				rows = await NrPostgresql.select(PGCONFIG, TEST_TABLE, where);

				AssertUtils.isArray(rows);
				AssertUtils.isEqual(rows.length, 1);
				AssertUtils.isEqual(rows[0].username, "foo2");
				AssertUtils.isEqual(rows[0].password, "bar999");
				AssertUtils.isDate(rows[0].created);

				// Reset back to original value
				await NrPostgresql.update(PGCONFIG, TEST_TABLE, where, {
					password: "bar2"
				});

			});

		}

	});

	describe('#select', () => {

		it('is callable', () => {
			AssertUtils.isFunction(NrPostgresql);
			AssertUtils.isFunction(NrPostgresql.select);
		});

		if (ENABLE_PGCONFIG) {

			it('can select rows', async () => {

				const where = {
					username: 'foo2'
				};

				let rows = await NrPostgresql.select(PGCONFIG, TEST_TABLE, where);

				AssertUtils.isArray(rows);
				AssertUtils.isEqual(rows.length, 1);
				AssertUtils.isEqual(rows[0].username, "foo2");
				AssertUtils.isEqual(rows[0].password, "bar2");
				AssertUtils.isDate(rows[0].created);

			});

		}

	});

});
