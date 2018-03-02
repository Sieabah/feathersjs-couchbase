'use strict';

const { CouchService } = require('./service');
const { QueryError, QueryBuilder, QueryConsistency, QueryInterpreter } = require('./querybuilder');

/**
 *
 * @type {(function(*=): *) & {CouchService: CouchService, QueryError: QueryError, QueryBuilder: QueryBuilder, QueryConsistency: QueryConsistency, QueryInterpreter: QueryInterpreter}}
 */
module.exports = Object.assign((config) => new CouchService(config), {
  CouchService,
  QueryError,
  QueryBuilder,
  QueryConsistency,
  QueryInterpreter
});
