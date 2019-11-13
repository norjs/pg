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

export { types };

const nrLog = LogUtils.getLogger("NrPostgreSQL");

/* Pool size */
const NOR_PG_POOL_SIZE = process.env.NOR_PG_POOL_SIZE ? parseInt(process.env.NOR_PG_POOL_SIZE, 10) : 10;

/**
 *
 */
export class NrPostgreSQL {

	static get nrName () {
		return "NrPostgreSQL";
	}

	get _Class () {
		return NrPostgreSQL;
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
	/** Implements `.on()` with PostgreSQL listen */
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

	/** Create connection (or take it from the pool)
	 *
	 * @returns {*|*}
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

	/** Commit transaction
	 *
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

	/** Get new connection and start transaction
	 *
	 * @param config {string}
	 * @returns {Promise.<NrResponse>}
	 */
	static async start (config) {

		let pg = new NrPostgreSQL(config);

		await pg.connect();

		return await pg.start();

	}

	/** Get new connection without starting a transaction
	 *
	 * @param config
	 * @returns {Promise.<NrResponse>}
	 */
	static async connect (config) {

		let pg = new NrPostgreSQL(config);

		return await pg.connect();

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

	/** `result` will have properties client and done from pg.connect()
	 *
	 * @param result {Object.<{client, done}>}
	 * @returns {*}
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

}

// noinspection JSUnusedGlobalSymbols
export default NrPostgreSQL;

/* EOF */
