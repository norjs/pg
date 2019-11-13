import AssertUtils from "@norjs/utils/Assert";

/* global describe, it */

const TEST_TABLE = 'test_account';

const PGCONFIG = process.env.PGCONFIG || 'pg://postgres@localhost/test';
const TEST_TIMEOUT = process.env.TEST_TIMEOUT ? parseInt(process.env.TEST_TIMEOUT, 10) : undefined;
const ENABLE_COVERAGE = !!process.env.ENABLE_COVERAGE;

let pg = ENABLE_COVERAGE ? require('../../src-cov/NrPostgresql.js') : require('../../src/NrPostgresql.js');

if ( pg && pg.default ) {
	pg = pg.default;
}

///** Run init() at start */
//before(() => pg.start(PGCONFIG).init().then(db => {
//	//var doc = db.fetch();
//	//debug.log('initialized database: doc = ', doc);
//	return db.commit();
//}));

/* */
describe('nor-pg', function(){

	if (TEST_TIMEOUT >= 2000) {
		this.timeout(TEST_TIMEOUT);
	}

	describe('.connect', function() {

		it('is callable', () => {
			AssertUtils.isFunction(pg);
			AssertUtils.isFunction(pg.connect);
		});

	});

	describe('.start', function() {

		it('is callable', () => {
			AssertUtils.isFunction(pg);
			AssertUtils.isFunction(pg.start);
		});

		it('can query rows', async () => {

			let db = await pg.start(PGCONFIG);

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

	});

});

/* EOF */

