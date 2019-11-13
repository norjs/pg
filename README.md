@norjs/pg (Originally [sendanor/nor-pg](https://github.com/sendanor/nor-pg))
=========================================

Promise-based PostgreSQL library NorJS micro services running in NodeJS.

Usage example
-------------

```javascript
import NrPostgreSQL from '@norjs/pg';

const PGCONFIG = 'postgres://username:password@localhost/dbname';

class SampleCode {

    async static run () {

        const tr = await NrPostgreSQL.start(PGCONFIG);
        
        await tr.query('SELECT * FROM foo');
        
        const rows = tr.fetch();
        
        console.log(rows);
        
        return await tr.commit();

    }
}

```

Installing
----------

You can install the module from NPM: `npm install @norjs/pg`

...and use it in your code:

```javascript
import NrPostgreSQL from '@norjs/pg';
```

Events usage example
--------------------

`@norjs/pg` also implements PostgreSQL's `NOTIFY` and `LISTEN` with a familiar 
looking Node.js interface.

You can listen your events through PostgreSQL server like this:

```javascript
class SampleCode {

    async static run () {
    
        const db = await NrPostgreSQL.connect(PGCONFIG);
        
        db.on('test', (a, b, c) => {
            console.log(
                'test payload: \n',
                ' a = ', a, '\n',
                ' b = ', b, '\n',
                ' c = ', c
            );
        });

    }

}
```

...and emit events like this:

```javascript
class SampleCode {

    async static run () {
    
        const db = await NrPostgreSQL.connect(PGCONFIG);

        await db.emit('test', {"foo":"bar"}, ["hello", "world"], 1234);

        return db.disconnect();

    }

}
```

 * `.emit(event_name, ...)` will encode arguments as JSON payload and execute 
   `NOTIFY event_name, payload`

 * `.on(event_name, listener)` and `.once(event_name, listener)` will start 
   `LISTEN event_name` and when PostgreSQL notifies, parses the payload (as JSON 
   array) as arguments for the listener and calls it.

***Please Note:*** Our methods will return promises, so you can and should catch 
possible errors.

You should not use anything other than standard `[a-z][a-z0-9_]*` as event 
names. We use or might use internally events starting with `$` and `_`, so 
especially not those!

Reference
---------

The full API reference.

******************************************************************************

### Promises

We use standard NodeJS (ES6) promises.

******************************************************************************

### NrPostgreSQL.start()

Creates [new NrPostgreSQL instance](https://github.com/norjs/pg#new-postgresqlconfig),
[connects it](https://github.com/norjs/pg#postgresqlprototypeconnect)
 and 
[start transaction in it](https://github.com/norjs/pg#postgresqlprototypestart).

Returns an promise of NrPostgreSQL instance after these operations.

```javascript
class SampleCode {

    async static run () {
    
        const tr = await NrPostgreSQL.start(PGCONFIG);

        await tr.query('INSERT INTO foo (a, b) VALUES ($1, $2)', [1, 2]);

        await tr.commit();

	    console.debug("All OK.");

    }
}
```


******************************************************************************

### new NrPostgreSQL(config)

The constructor function. You don't need to use this if you use 
[`.start()`](https://github.com/norjs/pg#postgresqlstart).

Returns new instance of PostgreSQL.

```javascript
class SampleCode {

    async static run () {

        const pg = new NrPostgreSQL(PGCONFIG);

        await pg.connect();

        await pg.start();

        await pg.query('INSERT INTO foo (a, b) VALUES ($1, $2)', [1, 2]);

        await pg.commit();

    	console.log("All OK.");

    }
}
```


******************************************************************************

### PostgreSQL.prototype.connect()

Create connection (or take it from the pool).

You don't need to use this if you use 
[`.start()`](https://github.com/norjs/pg#postgresqlstart).

Returns a promise of connected PostgreSQL instance.

```javascript
class SampleCode {

    async static run () {
        
        let pg = new NrPostgreSQL(PGCONFIG);

        await pg.connect();

        await pg.query('INSERT INTO foo (a, b) VALUES ($1, $2)', [1, 2]);
        
        await pg.disconnect();

        console.log("All OK.");

    }
}
```


******************************************************************************

### PostgreSQL.prototype.disconnect()

Disconnect connection (or actually release it back to pool).

You don't need to call this if you use 
[`.commit()`](https://github.com/norjs/pg#postgresqlprototypecommit)
 or 
[`.rollback()`](https://github
.com/norjs/pg#postgresqlprototyperollback), 
which will call `disconnect()`, too.

Returns a promise of disconnected PostgreSQL instance.

```javascript
class SampleCode {

    async static run () {
        
        let pg = new NrPostgreSQL(PGCONFIG);

        await pg.connect();

        await pg.query('INSERT INTO foo (a, b) VALUES ($1, $2)', [1, 2]);
        
        await pg.disconnect();

        console.log("All OK.");

    }
}
```


******************************************************************************

### PostgreSQL.prototype.directQuery(str[, params])

Lower level implementation of the query function.

Returns a promise of the result of the query directly. 

*No results are saved to the result queue.*

```javascript
class SampleCode {

    async static run () {

        const pg = new NrPostgreSQL(PGCONFIG);

        await pg.connect();

        const rows = await pg.directQuery('SELECT FROM foo WHERE a = $1', [1]);

        console.log("Rows = " , rows );
    
	    pg.disconnect();

    }
}
```


******************************************************************************

### PostgreSQL.prototype.query(str[, params])

The default query implementation.

The result of the query can be fetched from the result queue of NrPostgreSQL 
object using [`.fetch()`](https://github.com/norjs/pg#postgresqlprototypefetch).

Returns a promise of the instance of PostgreSQL object.

```javascript
class SampleCode {

    async static run () {

        const pg = await NrPostgreSQL.start(PGCONFIG);

        await pg.query('SELECT FROM foo WHERE a = $1', [1]);

        const rows = pg.fetch();

        console.debug("Rows = ", rows);

        return await pg.commit();

    }
}
```


******************************************************************************

### PostgreSQL.prototype.start()

Start transaction.

It will create new instance of PostgreSQL, then call 
[`.connect()`](https://github.com/norjs/pg#postgresqlprototypeconnect) 
and 
[`.start()`](https://github.com/norjs/pg#postgresqlprototypestart).

Returns a promise of the instance of PostgreSQL object after these operations.

```javascript
class SampleCode {

    async static run () {

        const pg = await NrPostgreSQL.start(PGCONFIG);

        await pg.query('SELECT FROM foo WHERE a = $1', [1]);

    	let rows = pg.fetch();
	    console.log("Rows = ", rows);

	    return await pg.commit();

    }
}
```


******************************************************************************

### PostgreSQL.prototype.commit()

Commits transaction. This will also call 
[`.disconnect()`](https://github.com/norjs/pg#postgresqlprototypedisconnect).

Returns a promise of the instance of PostgreSQL object after these operations.

```javascript
class SampleCode {

    async static run () {

        const pg = await NrPostgreSQL.start(PGCONFIG);

        await pg.query('SELECT FROM foo WHERE a = $1', [1]);

    	let rows = pg.fetch();
    	console.log("Rows = " , rows );

	    return await pg.commit();

    }
}
```


******************************************************************************

### PostgreSQL.prototype.rollback()

Rollback transaction. This will also call 
[`.disconnect()`](https://github.com/norjs/pg#postgresqlprototypedisconnect).

Returns a promise of the instance of PostgreSQL object after these operations.

```javascript
class SampleCode {

    async static run () {

        const pg = await NrPostgreSQL.start(PGCONFIG);

        await pg.query('INSERT INTO foo (1, 2, 3)');
        await pg.query('SELECT * FROM foo WHERE a = $1', [1]);

    	let rows = pg.fetch();

    	console.log("Rows = " , rows );

	    if (rows.length >= 3) {
		    return await pg.rollback();
	    }

    	return await pg.commit();

    }
}
```


******************************************************************************

### PostgreSQL.prototype.fetch()

Fetch next result from the result queue.

Returns the next value in the result queue of `undefined` if no more results.

This is implemented at [ActionObject of nor-extend](https://github.com/Sendanor/nor-extend/blob/master/lib/ActionObject.js#L32).

```javascript
class SampleCode {

    async static run () {

        const pg = await NrPostgreSQL.start(PGCONFIG);

        await pg.query('SELECT * FROM foo');

    	let rows = pg.fetch();
	    console.log("Rows = " , rows );

    	return await pg.commit();

    }
}
```

******************************************************************************

Commercial Support
------------------

You can buy commercial support from [Sendanor](http://sendanor.com/).
