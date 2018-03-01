# feathersjs-couchbase

[![Build Status](https://travis-ci.org/Sieabah/feathersjs-couchbase.svg?branch=master)](https://travis-ci.org/Sieabah/feathers-couchbase)
[![Maintainability](https://api.codeclimate.com/v1/badges/ac6cb7962df1a5a5958a/maintainability)](https://codeclimate.com/github/Sieabah/feathersjs-couchbase/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/ac6cb7962df1a5a5958a/test_coverage)](https://codeclimate.com/github/Sieabah/feathersjs-couchbase/test_coverage)
[![Dependencies Status](https://david-dm.org/sieabah/feathers-couchbase/status.svg)](https://david-dm.org/sieabah/feathersjs-couchbase)
[![Download Status](https://img.shields.io/npm/dm/@Sieabah/feathers-couchbase.svg?style=flat-square)](https://www.npmjs.com/package/@Sieabah/feathersjs-couchbase)

> FeathersJS DB adapter for couchbase

## Installation

```
npm install feathersjs-couchbase --save
```

## Documentation

Please refer to the [feathersjs-couchbase documentation](http://docs.feathersjs.com/) for more details.

## Complete Example

Here's an example of a Feathers server that uses `feathersjs-couchbase`.

```js
const feathers = require('feathers');
const rest = require('feathers-rest');
const hooks = require('feathers-hooks');
const bodyParser = require('body-parser');
const errorHandler = require('feathers-errors/handler');
const plugin = require('feathersjs-couchbase');

// Initialize the application
const app = feathers()
  .configure(rest())
  .configure(hooks())
  // Needed for parsing bodies (login)
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({ extended: true }))
  // Initialize your feathers plugin
  .use('/plugin', plugin())
  .use(errorHandler());

app.listen(3030);

console.log('Feathers app started on 127.0.0.1:3030');
```

## License

Copyright (c) 2017

Licensed under the [MIT license](LICENSE).
