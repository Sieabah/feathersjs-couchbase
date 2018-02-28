'use strict';

const { CouchService } = require('./service');
const { QueryError, QueryBuilder } = require('./querybuilder');

module.exports = CouchService;
module.exports.QueryError = QueryError;
module.exports.QueryBuilder = QueryBuilder;
