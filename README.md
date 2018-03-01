# feathersjs-couchbase

[![Build Status](https://travis-ci.org/Sieabah/feathersjs-couchbase.svg?branch=master)](https://travis-ci.org/Sieabah/feathersjs-couchbase)
[![Maintainability](https://api.codeclimate.com/v1/badges/ac6cb7962df1a5a5958a/maintainability)](https://codeclimate.com/github/Sieabah/feathersjs-couchbase/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/ac6cb7962df1a5a5958a/test_coverage)](https://codeclimate.com/github/Sieabah/feathersjs-couchbase/test_coverage)
[![Dependencies Status](https://david-dm.org/sieabah/feathersjs-couchbase/status.svg)](https://david-dm.org/sieabah/feathersjs-couchbase)
[![Download Status](https://img.shields.io/npm/dm/@Sieabah/feathersjs-couchbase.svg?style=flat-square)](https://www.npmjs.com/package/@Sieabah/feathersjs-couchbase)

> FeathersJS DB adapter for couchbase

## Installation

```
npm install feathersjs-couchbase --save
```

## Documentation

```
const couchbase = require('couchbase-promises')
const cluster = new couchbase.Cluster('couchbase://127.0.0.1')
const bucketName = 'default';
const bucket = cluster.openBucket(bucketName)

const config = {
  name: 'users', // Name of service and key prefix (REQUIRED)
  bucket: bucketName, // Couchbase bucket name (REQUIRED)
  connection: bucket, // Bucket connection (REQUIRED)
  
  couchbase: couchbase, // optional couchbase dependency (OPTIONAL)
  id: 'id', // ID field to use (OPTIONAL) (defaults to `uuid`)
  paginate: app.get('paginate'), // (OPTIONAL)
};

// Initialize our service with all options it requires
app.use(`/${options.name}`, new Service(options));
 
const createService = require('feathersjs-couchbase')
  
// Method 1
app.use('/',createService(config));
 
// Method 2
const { CouchService } = require('feathersjs-couchbase');
new CouchService(config)
```

## Missing features

Does not accept **$or** statements yet.

## License

Copyright (c) 2017

Licensed under the [MIT license](LICENSE).
