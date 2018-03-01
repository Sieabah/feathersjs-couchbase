'use strict';

/* eslint-disable indent */

const debug = require('debug')('feathers-couchbase:QueryBuilder');
const QueryError = require('./queryerror');

class QueryBuilder {
  constructor (bucket = null) {
    debug(`Create query with bucket '${bucket}'`);
    this.bucket = bucket;
    this.query = [];
    this._values = [];
  }

  _parameterValue (value) {
    this._values.push(value);
    return `$${this._values.length}`;
  }

  _getQueryValues () {
    return this._values.map(a => a);
  }

  _add (type, params) {
    debug(`Add parameter of type '${type}' with parameters '${JSON.stringify(params)}'`);
    this.query.push({ type, params });
  }

  select (...selected) {
    this._add('select', selected);
  }

  from (name) {
    this._add('from', name);
  }

  limit (amount) {
    if (amount == null) {
      throw new QueryError('Amount must be specified');
    }

    this._add('limit', amount);
  }

  skip (amount) {
    if (amount == null) {
      throw new QueryError('Amount must be specified');
    }

    this._add('skip', amount);
  }

  sort (fields, order = 'ASC') {
    if (fields == null) {
      throw new QueryError('Required to have at least one field to sort');
    }

    if (typeof fields === 'string') {
      fields = [fields];
    }

    if (!~['ASC', 'DESC'].indexOf(order.toUpperCase())) {
      throw new QueryError('Order must be ASC or DESC');
    }

    this._add('sort', { fields, order: order.toUpperCase() });
  }

  where (field, operation, value) {
    this._add(operation, { field, value });
  }

  interpret ($query, fieldName = null) {
    const whereClauses = [
      'lt', 'lte', 'gt', 'gte', 'ne', 'in', 'nin', 'or'
    ];

    debug('Interpret fields in query');
    for (let field in $query) {
      /* istanbul ignore next */
      if (!$query.hasOwnProperty(field)) continue;

      // Check if null, an object, and that it's not array. (possible subquery)
      if ($query[field] != null && typeof $query[field] === 'object' && !Array.isArray($query[field])) {
        debug(`Field (${field}) interpreted as potential subquery`);
        this.interpret($query[field], field);
      }

      const bareField = field.replace('$', '');

      // Handle major where clauses
      if (field[0] === '$' && ~whereClauses.indexOf(bareField)) {
        debug(`Where clause ${field} found`);

        // If fieldname is set, parameters are applied to field
        if (fieldName != null) {
          this.where(fieldName, bareField, $query[field]);
        } else {
          this.where(null, bareField, $query[field]);
        }
      } else if (field[0] !== '$' && (typeof $query[field] !== 'object' || $query[field] == null)) { // Handle equality
        debug(`Where clause equality found`);
        this.where(bareField, 'eq', $query[field]);
      } else { // Handle other clauses
        switch (bareField) {
          case 'sort':
            debug(`Sort clause found`);
            for (let key in $query[field]) {
              /* istanbul ignore next */
              if (!$query[field].hasOwnProperty(key)) { continue; }

              this.sort(key, $query[field][key] > 0 ? 'ASC' : 'DESC');
            }
            break;
          default:
            debug(`Clause found (${bareField})`);
            this._add(bareField, $query[field]);
            break;
        }
      }
    }

    return this;
  }

  _select (components, bucket) {
    // query.$select -> SELECT
    if (components == null) {
      components = ['*'];
    }

    if (bucket != null) {
      components = components.map((component) => `\`${bucket}\`.${component}`);
    }

    return `SELECT ${components.join(',')}`;
  }

  _from (bucket) {
    return `FROM \`${bucket}\``;
  }

  _where (components, operation = 'AND') {
    let statements = [];

    for (let component of components) {
      let { field, value } = component.params;

      // field = this._parameterValue(field);

      if (value == null) {
        value = 'NULL';
      } else {
        value = this._parameterValue(value);
      }

      // query.$in -> IN
      // query.$nin -> NOT IN
      // query.$lt -> WHERE x < n
      // query.$lte -> WHERE x <= n
      // query.$gt -> WHERE x > n
      // query.$gte -> WHERE x >= n
      // query.$ne -> WHERE x != n
      // query.$eq -> WHERE x == n
      // query.$or -> OR
      switch (component.type) {
        case 'lt':
          statements.push(`${field} < ${value}`);
          break;
        case 'lte':
          statements.push(`${field} <= ${value}`);
          break;
        case 'gt':
          statements.push(`${field} > ${value}`);
          break;
        case 'gte':
          statements.push(`${field} >= ${value}`);
          break;
        case 'ne':
          statements.push(`${field} != ${value}`);
          break;
        case 'eq':
          statements.push(`${field} = ${value}`);
          break;
        case 'in':
          statements.push(`${field} IN ${value}`);
          break;
        case 'nin':
          statements.push(`${field} NOT IN ${value}`);
          break;
        case 'or':
          throw new Error('Or case not implemented');
      }
    }

    return 'WHERE ' + statements.join(` ${operation.toUpperCase()} `);
  }

  _sort (groups) {
    const statements = [];
    for (let group of groups) {
      const { fields, order } = group;

      statements.push(`${fields.map(field => [this._parameterValue(field), order].join(' ')).join(', ')}`);
    }
    return `ORDER BY ${statements.join(', ')}`;
  }

  _limit (amount) {
    return `LIMIT ${amount}`;
  }

  _skip (amount) {
    return `OFFSET ${amount}`;
  }

  build () {
    let $select = null;
    let $from = this.bucket;
    let $where = [];
    let $limit = null;
    let $skip = null;
    let $sort = [];

    const isNumeric = (n) => !isNaN(parseFloat(n)) && isFinite(n);

    for (let component of this.query) {
      switch (component.type) {
        case 'from':
          $from = component.params;
          break;
        // query.$select -> SELECT
        case 'select':
            $select = component.params;
          break;
        case 'lt':
        case 'lte':
        case 'gt':
        case 'gte':
        case 'ne':
        case 'in':
        case 'nin':
        case 'or':
        case 'eq':
          $where.push(component);
          break;
        // query.$limit -> LIMIT
        case 'limit':
          if (!isNumeric(component.params)) {
            throw new QueryError('Limit parameter must be numeric');
          }

          $limit = parseInt(component.params);
          break;
        // query.$skip -> OFFSET
        case 'skip':
          if (!isNumeric(component.params)) {
            throw new QueryError('Skip parameter must be numeric');
          }

          $skip = parseInt(component.params);
          break;
        // query.$sort -> ORDER
        case 'sort':
          $sort.push(component.params);
          break;
      }
    }

    let $query = [];

    $query.push(this._select($select, $from));

    if (this.bucket) { $query.push(this._from($from)); }

    if ($where.length > 0) { $query.push(this._where($where)); }

    if ($sort.length > 0) { $query.push(this._sort($sort)); }

    if ($limit != null) { $query.push(this._limit($limit)); }

    if ($skip != null) { $query.push(this._skip($skip)); }

    const values = this._getQueryValues();
    debug(`Build query is ${$query}, with values ${values}`);
    return { query: $query.join(' '), values: values };
  }
}

module.exports = QueryBuilder;

/* eslint-enable indent */
