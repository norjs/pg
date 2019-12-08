/**
 * @file Extended PostgreSQL bindings for pg module
 * @Copyright 2014-2019 Jaakko-Heikki Heusala <jheusala@iki.fi>
 */

import EventEmitter from 'events';
import _ from 'lodash';
import pg_escape from 'pg-escape';
import { Pool, types } from 'pg';
import LogUtils from "@norjs/utils/Log";
import AssertUtils from "@norjs/utils/Assert";
import { NrPgOID } from "./NrPgOID";
import PgQueryUtils from "./PgQueryUtils";
import { PgSelectOptions } from "./PgSelectOptions";
import { PgOperator } from "./PgOperator";

const nrLog = LogUtils.getLogger("NrPostgreSQL");

/* Pool size */
const NOR_PG_POOL_SIZE = process.env.NOR_PG_POOL_SIZE ? parseInt(process.env.NOR_PG_POOL_SIZE, 10) : 10;

/**
 *
 */
export class NrPostgreSQL {

	/**
	 *
	 * @returns {string}
	 */
	static get nrName () {
		return "NrPostgreSQL";
	}

	/**
	 *
	 * @param logLevel {LogLevel|string}
	 */
	static setLogLevel (logLevel) {
		nrLog.setLogLevel(logLevel);
	}

	/**
	 *
	 * @returns {typeof PgQuerySymbol}
	 */
	static get Symbol () {
		return PgQueryUtils.Symbol;
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
     * @returns {typeof PgOperator}
     */
	static get Operator () {
	    return PgOperator;
    }

	/**
	 *
	 * @returns {typeof NrPgOID}
	 */
	static get OID () {
		return NrPgOID;
	}

	/**
	 *
	 * @param type {NrPgOID|number}
	 * @param f {function(*): *}
	 */
	static setTypeParser (type, f) {

		types.setTypeParser(type, f);

	}

	/** Get new connection and start transaction
	 *
	 * @param config {string}
	 * @returns {Promise.<NrPostgreSQL>}
	 */
	static async start (config) {

		let pg = new NrPostgreSQL(config);

		await pg.connect();

		return await pg.start();

	}

	/** Get new connection without starting a transaction
	 *
	 * @param config
	 * @returns {Promise.<NrPostgreSQL>}
	 */
	static async connect (config) {

		let pg = new NrPostgreSQL(config);

		return await pg.connect();

	}

	/**
	 *
	 * @returns {typeof NrPostgreSQL}
	 */
	get Class () {
		return NrPostgreSQL;
	}

	/**
	 *
	 * @returns {string}
	 */
	get nrName() {
		return this.Class.nrName;
	}

	/** PostgreSQL connection constructor
	 *
	 * @param config {string}
	 */
	constructor (config) {

		/**
		 *
		 * @member {string}
		 * @private
		 */
		this._config = config;

		/**
		 *
		 * @member {module:events.internal}
		 * @private
		 */
		this._events = new EventEmitter();

		/**
		 *
		 * @member {function(...[*]): *|undefined}
		 * @private
		 */
		this._connQuery = undefined;

		/**
		 *
		 * @member {Function|undefined}
		 * @private
		 */
		this._connDone = undefined;

		/**
		 *
		 * @member {Object|undefined}
		 * @private
		 */
		this._connClient = undefined;

		/**
		 *
		 * @member {Function|undefined}
		 * @private
		 */
		this._notification_listener = undefined;

		/**
		 * Result buffer for queries
		 *
		 * @member {Array.<*>}
		 * @private
		 */
		this._resultBuffer = [];

	}

	/** Create connection (or take it from the pool)
	 *
	 * @returns {Promise.<NrPostgreSQL>}
	 */
	async connect () {

		//nrLog.trace('.connect()...');

		if ( _.has(this, '_conn.client') ) {
			throw new TypeError("Connected already?");
		}

		this._notification_listener = (...args) => this._notificationEventListener(...args);

		AssertUtils.isFunction(this._notification_listener);

		if (!this.pool) {

			this.pool = new Pool({
				max: NOR_PG_POOL_SIZE,
				connectionString: this._config
			});

		}

		const args = await this._Class._connectPool(this.pool);

		return this._handleResponse(args);

	}

	/** Disconnect connection (or actually release it back to pool)
	 *
	 * @returns {NrPostgreSQL}
	 */
	disconnect () {

		let listener = this._notification_listener;

		if (_.isFunction(listener)) {

			if (this._connClient) {
				this._connClient.removeListener('notification', listener);
			} else {
				nrLog.warn(`No _connClient detected.`);
			}

			this._notification_listener = undefined;

		}

		if ( this._connDone ) {

			this._connDone();
			this._connDone = undefined;

		} else {

			nrLog.warn('called on uninitialized connection -- maybe multiple times?');

		}

		this._connClient = undefined;
		this._connQuery = undefined;

		return this;

	}

	/** Start transaction
	 *
	 * @returns {Promise}
	 */
	async start () {

		await this.directQuery('BEGIN');

		return this;

	}

	/** Commit transaction without disconnecting
	 *
	 * @returns {Promise<NrPostgreSQL>}
	 */
	async commitOnly () {

		await this.directQuery('COMMIT');

		return this;

	}

	/** Commit transaction and disconnect from database
	 *
	 * @fixme This should probably be named as commitAndDisconnect()...
	 * @returns {Promise<NrPostgreSQL>}
	 */
	async commit () {

		await this.directQuery('COMMIT');

		return this.disconnect();

	}

	/** Rollback transaction
	 *
	 * @returns {Promise<NrPostgreSQL>}
	 */
	async rollback () {

		await this.directQuery('ROLLBACK');

		return this.disconnect();

	}

	/** Listen a channel
	 *
	 * @param channel
	 * @returns {Promise<NrPostgreSQL>}
	 */
	listen (channel) {

		AssertUtils.isStringPattern(channel, /^[a-zA-Z][a-zA-Z0-9_]*$/);

		return this.directQuery(pg_escape('LISTEN %I', channel)).then(() => this);

	}

	/** Stop listening a channel
	 *
	 * @param channel
	 * @returns {Promise<NrPostgreSQL>}
	 */
	unlisten (channel) {

		AssertUtils.isStringPattern(channel, /^[a-zA-Z][a-zA-Z0-9_]*$/);

		return this.directQuery(pg_escape('UNLISTEN %I', channel)).then(() => this);

	}

	/** Notify a channel
	 *
	 * @param channel
	 * @param payload
	 * @returns {Promise<NrPostgreSQL>}
	 */
	notify (channel, payload) {

		AssertUtils.isStringPattern(channel, /^[a-zA-Z][a-zA-Z0-9_]*$/);

		if (payload !== undefined) {
			return this.directQuery(pg_escape('NOTIFY %I, %L', channel, payload)).then(() => this);
		}

		return this.directQuery(pg_escape('NOTIFY %I', channel)).then(() => this);

	}

	addListener (...args) {

		let name = args[0];

		if ( name && (name.charAt(0) === '$') ) {
			this._events.addListener.apply(this, args);
			return this;
		}

		return this._addListener.apply(this, args);

	}

	removeListener (...args) {

		let name = args[0];

		if ( name && (name.charAt(0) === '$') ) {
			this._events.removeListener.apply(this, args);
			return this;
		}

		return this._removeListener.apply(this, args);

	}

	on (...args) {

		let name = args[0];

		if ( name && (name.charAt(0) === '$') ) {
			this._events.on.apply(this, args);
			return this;
		}

		return this._on.apply(this, args);

	}

	once (...args) {

		let name = args[0];

		if ( name && (name.charAt(0) === '$') ) {
			this._events.once.apply(this, args);
			return this;
		}

		return this._once.apply(this, args);

	}

	emit (...args) {

		let name = args[0];

		if ( name && (name.charAt(0) === '$') ) {
			this._events.emit.apply(this, args);
			return this;
		}

		return this._emit.apply(this, args);

	}

	/**
	 *
	 * @param str {string}
	 * @param [params] {Array.<*>|undefined}
	 * @returns {Promise<*>}
	 */
	async directQuery (str, params = undefined) {

		if ( this._connQuery === undefined ) {
			throw new TypeError("Disconnected from NrPostgreSQL");
		}

		AssertUtils.isFunction(this._connQuery);

		let result;

		if (params === undefined) {
			result = await this._connQuery(str);
		} else {
			result = await this._connQuery(str, params);
		}

		return result.rows;

	}

	/**
	 *
	 * @param str {string}
	 * @param [params] {Array.<*>|undefined}
	 * @returns {Promise<*>}
	 */
	async query (str, params = undefined) {

		const mySymbol = Symbol();

		this._resultBuffer.push(mySymbol);

		const rows = await this.directQuery(str, params);

		const index = this._resultBuffer.indexOf(mySymbol);

		if (index >= 0) {
			this._resultBuffer[index] = rows;
		}

		return this;

	}

	/**
	 * Fetch next value from the result buffer
	 *
	 * @returns {*|undefined}
	 */
	fetch () {

		return this._resultBuffer.shift();

	}

	/**
	 * Fetch all values from the result buffer
	 *
	 * @returns {Array<*>}
	 */
	fetchAll () {

		const all = this._resultBuffer;
		this._resultBuffer = [];
		return all;

	}

	/**
	 * Insert rows into table.
	 *
	 * @param pgconfig {string} The database configuration string
	 * @param table {string} The table name
	 * @param values {Array.<Object>} Values to insert to the table
	 * @param [bindings] {Object.<string, string>|undefined} Optional bindings between the table keyword and value
	 * @returns {Promise.<Array<Object>>}
	 */
	static async insert (pgconfig, table, values, bindings = undefined) {

		AssertUtils.isString(pgconfig);
		AssertUtils.isString(table);
		AssertUtils.isArray(values);
		if (bindings !== undefined) AssertUtils.isObject(bindings);

		nrLog.trace(`${this.nrName}.insert(): Initializing transaction...`);

		const db = await this.start(pgconfig);

		let rows = undefined;

		try {

			await db.insert(table, values, bindings);

			rows = db.fetch();

			await db.commit();

		} catch (err) {

			nrLog.trace(`${this.nrName}.insert(): Rollback because error: `, err);
			await db.rollback();

			throw err;

		}

		nrLog.trace(`${this.nrName}.insert(): rows: `, rows);

		return rows;

	}

	/**
	 * Perform a query inside a transaction.
	 *
	 * @param pgconfig {string} The database configuration string
	 * @param str {string} Query string
	 * @param [params] {Array.<*>|undefined} Query params
	 * @returns {Promise.<Array<Object>>}
	 */
	static async query (pgconfig, str, params = undefined) {

		AssertUtils.isString(pgconfig);
		AssertUtils.isString(str);
		if (params !== undefined) AssertUtils.isObject(params);

		nrLog.trace(`${this.nrName}.query(): Initializing transaction...`);

		const db = await this.start(pgconfig);

		let rows = undefined;

		try {

			await db.query(str, params);

			rows = db.fetch();

			await db.commit();

		} catch (err) {

			nrLog.trace(`${this.nrName}.query(): Rollback because error: `, err);
			await db.rollback();

			throw err;

		}

		nrLog.trace(`${this.nrName}.query(): rows: `, rows);

		return rows;

	}

	/**
	 * Update rows in table.
	 *
	 * @param pgconfig {string} The database configuration string
	 * @param table {string} The table name
	 * @param where {Object.<string,string>} Which rows to update
	 * @param changes {Object} Values to insert to the table
	 * @param [bindings] {Object.<string, string>|undefined} Optional bindings between the table keyword and value
	 * @returns {Promise.<Array<Object>>}
	 */
	static async update (pgconfig, table, where, changes, bindings = undefined) {

		AssertUtils.isString(pgconfig);
		AssertUtils.isString(table);
		AssertUtils.isObject(where);
		AssertUtils.isObject(changes);
		if (bindings !== undefined) AssertUtils.isObject(bindings);

		nrLog.trace(`${this.nrName}.update(): Initializing transaction...`);

		/**
		 *
		 * @type {NrPostgreSQL}
		 */
		const db = await this.start(pgconfig);

		let rows = undefined;

		try {

			await db.update(table, where, changes, bindings);

			rows = db.fetch();

			await db.commit();

		} catch (err) {

			nrLog.trace(`${this.nrName}.update(): Rollback because error: `, err);
			await db.rollback();

			throw err;

		}

		nrLog.trace(`${this.nrName}.update(): rows: `, rows);

		return rows;

	}

	/**
	 * Select rows from a table.
	 *
	 * @param pgconfig {string} The database configuration string
	 * @param table {string} The table name
	 * @param [where] {Object.<string,string>|PgSelectOptions|undefined} Which rows to update
	 * @param [options] {PgSelectOptions|undefined} Which rows to update
	 * @returns {Promise.<Array<Object>>}
	 */
	static async select (pgconfig, table, where = undefined, options = undefined) {

		AssertUtils.isString(pgconfig);
		AssertUtils.isString(table);
		if (where !== undefined) AssertUtils.isObject(where);
		if (options !== undefined) AssertUtils.isObject(options);

		nrLog.trace(`${this.nrName}.select(): Initializing transaction...`);

		const db = await this.start(pgconfig);

		let rows = undefined;

		try {

			await db.select(table, where, options);

			rows = db.fetch();

			await db.commit();

		} catch (err) {

			nrLog.trace(`${this.nrName}.select(): Rollback because error: `, err);
			await db.rollback();

			throw err;

		}

		nrLog.trace(`${this.nrName}.select(): rows: `, rows);

		return rows;

	}

	/**
	 * Insert rows into table.
	 *
	 * @param table {string} The table name
	 * @param values {Array.<Object>} Values to insert to the table
	 * @param [bindings] {Object.<string, string>|undefined} Optional bindings between the table keyword and value
	 * @returns {Promise.<Array<Object>>}
	 */
	async insert (table, values, bindings = undefined) {

		AssertUtils.isString(table);
		AssertUtils.isArray(values);
		if (bindings !== undefined) AssertUtils.isObject(bindings);

		const query = PgQueryUtils.createInsertQuery(table, values, bindings);

		nrLog.debug(`${this.nrName}.prototype.insert(): Executing query "${query.queryString}" with values: `, query.queryValues);

		await this.query(query.queryString, query.queryValues);

	}

	/**
	 * Update rows in a table.
	 *
	 * @param table {string} The table name
	 * @param where {Object.<string,string>} Which rows to update
	 * @param changes {Object} Values to change in the row
	 * @param [bindings] {Object.<string, string>|undefined} Optional bindings between the table keyword and value
	 * @returns {Promise.<Array<Object>>}
	 */
	async update (table, where, changes, bindings = undefined) {

		AssertUtils.isString(table);
		AssertUtils.isObject(where);
		AssertUtils.isObject(changes);
		if (bindings !== undefined) AssertUtils.isObject(bindings);

		const query = PgQueryUtils.createUpdateQuery(table, where, changes, bindings);

		nrLog.debug(`${this.nrName}.prototype.update(): Executing query "${query.queryString}" with changes: `, query.queryValues);

		await this.query(query.queryString, query.queryValues);

	}

	/**
	 * Select rows from a table.
	 *
	 * @param table {string} The table name
	 * @param [where] {Object.<string,string>|PgSelectOptions|undefined} Which rows to update
	 * @param [options] {PgSelectOptions|undefined} Which rows to update
	 */
	async select (table, where = undefined, options = undefined) {

		AssertUtils.isString(table);
		if ( where !== undefined ) AssertUtils.isObject(where);
		if ( options !== undefined ) AssertUtils.isObject(options);

		const query = PgQueryUtils.createSelectQuery(table, where, options);

		nrLog.debug(`${this.nrName}.prototype.select(): Executing query "${query.queryString}" with values: `, query.queryValues);

		await this.query(query.queryString, query.queryValues);

	}

	/**
	 *
	 * @param pool {{connect: function}}
	 * @returns {Promise<{client, done}>}
	 * @private
	 */
	static async _connectPool (pool) {

		AssertUtils.isObject(pool);
		AssertUtils.isFunction(pool.connect);

		return await new Promise(( resolve, reject ) => {

			pool.connect( ( err, client, done ) => {

				if (err) {

					reject(err);

				} else {

					resolve({client, done});

				}

			} );

		});

	}

	/**
	 * Call a function and resolves as promise.
	 *
	 * @param call {function: T}
	 * @returns {Promise.<T>}
	 * @template T
	 * @private
	 */
	static async _promiseCall (call) {

		AssertUtils.isFunction(call);

		return await new Promise( (resolve, reject) => {
			try {
				resolve(call());
			} catch (err) {
				reject(err);
			}
		});

	}

	/**
	 *
	 * @param desc {string}
	 * @param fn {function(...[*]): T}
	 * @returns {function(...[*]): Promise.<T>}
	 * @template T
	 * @private
	 */
	static _nr_nfbind (desc, fn) {
		return (...args) => this._promiseCall(() => fn(...args));
	}

	/**
	 *
	 * @returns {typeof NrPostgreSQL}
	 * @private
	 */
	get _Class () {
		return NrPostgreSQL;
	}

	// noinspection JSUnusedGlobalSymbols
	/** Implements `.addListener()` with PostgreSQL listen
	 *
	 * @param name
	 * @param listener
	 * @returns {*}
	 * @private
	 */
	_addListener (name, listener) {

		AssertUtils.isString(name);
		AssertUtils.isFunction(listener);

		//nrLog.trace('name =', name, ', listener=', listener);

		this._events.addListener(name, listener);

		return this.listen(name);

	}

	// noinspection JSUnusedGlobalSymbols
	/** Implements `.removeListener()` with PostgreSQL listen
	 *
	 * @param name
	 * @param listener
	 * @returns {*}
	 * @private
	 */
	_removeListener (name, listener) {

		AssertUtils.isString(name);
		AssertUtils.isFunction(listener);

		//nrLog.trace('name =', name, ', listener=', listener);

		this._events.removeListener(name, listener);

		return this.unlisten(name);

	}

	// noinspection JSUnusedGlobalSymbols
	/** Implements `.on()` with PostgreSQL listen
	 *
	 * @param name {string}
	 * @param listener {function}
	 * @private
	 */
	_on (name, listener) {

		AssertUtils.isString(name);
		AssertUtils.isFunction(listener);

		//nrLog.trace('name =', name, ', listener=', listener);

		this._events.on(name, listener);

		return this.listen(name);

	}

	// noinspection JSUnusedGlobalSymbols
	/** Implements `.once()` with PostgreSQL listen and unlisten
	 *
	 * @param name
	 * @param listener
	 * @returns {*}
	 * @private
	 */
	_once (name, listener) {

		AssertUtils.isString(name);
		AssertUtils.isFunction(listener);

		//nrLog.trace('name =', name, ', listener=', listener);

		const parentThis = this;

		this._events.once(name, function(...args) {
			let self2 = this;
			parentThis.unlisten(name).fail(err => {
				nrLog.error('Failed to unlisten: ', err);
			}).done();
			return listener.apply(self2, args);
		});

		return this.listen(name);

	}

	// noinspection JSUnusedGlobalSymbols
	/** Implements `.emit()` with PostgreSQL notify
	 *
	 * @param args
	 * @returns {*}
	 * @private
	 */
	_emit (...args) {

		let name = args.shift();
		AssertUtils.isString(name);

		//nrLog.trace('name =', name);
		//nrLog.trace('args =', args);
		let payload = JSON.stringify(args);

		//nrLog.trace('payload =', payload);

		return this.notify(name, payload);

	}

	/** `result` will have properties client and done from pg.connect()
	 *
	 * @param result {Object.<{client, done}>}
	 * @returns {NrPostgreSQL}
	 * @private
	 */
	_handleResponse (result) {

		//nrLog.trace('_handleResponse()...');

		AssertUtils.isObject(result);
		AssertUtils.isObject(result.client);

		let client = result.client;

		AssertUtils.isFunction(client.query);

		this._connQuery = this._Class._nr_nfbind("nor-pg:query", client.query.bind(client));
		this._connDone = result.done;
		this._connClient = client;

		// Pass NOTIFY to clients
		if (_.isFunction(this.emit)) {
			AssertUtils.isFunction(this._notification_listener);
			client.on('notification', this._notification_listener);
		}

		return this;

	}

	/** Event listener
	 *
	 * @param msg
	 * @private
	 */
	_notificationEventListener (msg) {

		//nrLog.trace('msg = ', msg);

		this._events.emit('$notification', msg);

		//msg = {
		//  name: 'notification',
		//  length: 70,
		//  processId: 1707,
		//  channel: 'tcn',
		//  payload: '"documents",I,"id"=\'0c402f6f-8126-5dc3-a4df-20035bc8304d\''
		//}

		/* Parse notification and emit again correctly */
		let channel = msg && msg.channel || undefined;
		let payload = msg && msg.payload || undefined;

		//nrLog.trace(
		//	'channel = ', channel, '\n',
		//	'payload = ', payload
		//);

		if ( (payload.charAt(0) !== '[') ) {
			this._events.emit(channel, payload);
			return;
		}

		let parsed_payload;

		try {
			parsed_payload = JSON.parse(payload);
		} catch(e) {
			this._events.emit(channel, payload);
			return;
		}

		//nrLog.trace('parsed_payload = ', parsed_payload);

		if (_.isArray(parsed_payload)) {
			this._events.emit.apply(this._events, [channel].concat(parsed_payload));
		} else {
			this._events.emit.apply(this._events, [channel].concat([parsed_payload]));
		}

	}

}

// noinspection JSUnusedGlobalSymbols
export default NrPostgreSQL;

/* EOF */
