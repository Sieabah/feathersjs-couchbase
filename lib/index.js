'use strict';

const { CouchService } = require('./service');
const { QueryError, QueryBuilder, QueryConsistency } = require('./querybuilder');

module.exports = (config) => new CouchService(config);
module.exports.CouchService = CouchService;
module.exports.QueryError = QueryError;
module.exports.QueryBuilder = QueryBuilder;
module.exports.QueryConsistency = QueryConsistency;
