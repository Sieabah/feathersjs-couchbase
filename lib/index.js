'use strict';

const { CouchService, FeathersQueryInterpreter } = require('./service');
const { QueryError, QueryBuilder, QueryConsistency } = require('./querybuilder');

/**
 *
 * @type {(function(*=): *) & {CouchService: CouchService, QueryError: QueryError, QueryBuilder: QueryBuilder, QueryConsistency: QueryConsistency, QueryInterpreter: QueryInterpreter}}
 */
module.exports = Object.assign((config) => new CouchService(config), {
  CouchService,
  QueryError,
  QueryBuilder,
  QueryConsistency,
  FeathersQueryInterpreter
});
