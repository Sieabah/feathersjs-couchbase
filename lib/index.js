'use strict';

const { CouchService } = require('./service');
const { QueryError, QueryBuilder } = require('./querybuilder');

module.exports = (config) => new CouchService(config);
module.exports.CouchService = CouchService;
module.exports.QueryError = QueryError;
module.exports.QueryBuilder = QueryBuilder;
