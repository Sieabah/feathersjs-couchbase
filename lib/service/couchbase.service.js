'use strict';

const Promise = require('bluebird');
const { BadRequest, NotFound, NotImplemented } = require('@feathersjs/errors');
const { keyNotFound } = require('couchbase').errors;
const { QueryBuilder, QueryConsistency } = require('../querybuilder');
const uuid = require('uuid/v4');
const R = require('ramda');

class Service {
  /**
   * Couchbase Service
   * @param {object} opts - Couchbase Service options
   * @param {string} opts.bucket - Bucket name (REQUIRED)
   * @param {object|Promise} opts.connection - Couchbase bucket connection or promise which resolves to connection (REQUIRED)
   * @param {string} opts.name - Service name (REQUIRED)
   * @param {object|array<string>>} opts.multi - Enable multi-CRUD operations, optionally can an array of strings which specify which
   *  functions allow mutli-access(OPTIONAL)
   * @param {object} opts.couchbase - Couchbase package dependency (OPTIONAL)
   * @param {string} opts.separator - Key separator (OPTIONAL)
   * @param {object} opts.paginate - FeathersJS Paginate object (OPTIONAL)
   * @param {string} opts.id - Field to use for unique key (OPTIONAL), DO NOT change this without data migration
   */
  constructor (opts) {
    this.opts = opts || {};

    if (this.opts.couchbase == null) {
      this.opts.couchbase = require('couchbase');
    }

    if (this.opts.bucket == null) { throw new Error('Must pass bucket name'); }

    if (this.opts.connection == null) { throw new Error('Must pass bucket connection'); }

    if (this.opts.name == null) { throw new Error('Name of service must be specified'); }

    this.id = opts.id || 'uuid';
    this.paginate = opts.paginate || {};
    this.separator = opts.separator || '::';

    if (opts.multi && Array.isArray(opts.multi)) {
      this.multi = {};
      for (const method of opts.multi) {
        this.multi[method] = 1;
      }
    } else { this.multi = !!opts.multi; }
  }

  /**
   * FeathersJS Service Setup
   * @param app
   * @param path
   */
  setup (app, path) {
    this.app = app;
    this.path = path;
  }

  /**
   * Get couchbase connection
   */
  schema () {
    // Promisfy the passed in connection in case it's already active and not awaiting it
    return Promise.resolve(this.opts.connection);
  }

  _isMultiAllowed (methodName) {
    if (this.multi === false) {
      return false;
    } else if (this.multi === true || this.multi[methodName]) {
      return true;
    }
  }

  /**
   * Translate Couchbase Errors to FeathersErrors
   * @param err
   * @private
   */
  _handleError (err) {
    /* istanbul ignore else */
    if (err.code === keyNotFound) {
      throw new NotFound('Does not exist');
    }

    /* istanbul ignore next */
    throw err;
  }

  /**
   * Build key
   * @param key Key to prefix
   * @returns {string}
   * @private
   */
  _key (key = '') {
    return [this.opts.name || '', key].join(this.separator);
  }

  /**
   * Get id if one is passed in, otherwise provide one
   * @param data
   * @returns {string}
   * @private
   */
  _id (data) {
    if (!(this.id in data)) { data[this.id] = uuid(); }

    return data[this.id];
  }

  /**
   * Strip keys from Service.find response query
   * @param selected Selected keys
   * @param results Result set
   * @return {Array}
   * @private
   */
  _stripKeys (selected, results) {
    return results.map(a => {
      const result = {};
      for (let key in a) {
        if (a.hasOwnProperty(key) && ~selected.indexOf(key)) { result[key] = a[key]; }
      }

      return result;
    });
  }

  /**
   * Build N1QL Query
   * @param couchbase {object} Couchbase dependency
   * @param str {string} Query String
   * @param consistency {Number} N1QL Consistency
   * @param readonly {boolean} N1QL readonly
   * @private
   */
  _buildN1QL (couchbase, str, consistency, readonly = false) {
    const $query = couchbase.N1qlQuery.fromString(str);

    if (consistency === QueryConsistency.NOT_BOUNDED) {
      $query.consistency(couchbase.N1qlQuery.Consistency.NOT_BOUNDED);
    } else if (consistency === QueryConsistency.REQUEST_PLUS) {
      $query.consistency(couchbase.N1qlQuery.Consistency.REQUEST_PLUS);
    } else if (consistency === QueryConsistency.STATEMENT_PLUS) {
      $query.consistency(couchbase.N1qlQuery.Consistency.STATEMENT_PLUS);
    }

    // Find queries shouldn't ever mutate...
    $query.readonly(readonly);

    return $query;
  }

  _find (query, paginate, consistency = null) {
    const { couchbase } = this.opts;
    const QB = (new QueryBuilder(this.opts.bucket));
    const { query: queryStr, values } = QB.interpret(query);

    let selected = [];

    if (query.$select) {
      for (let select of query.$select) { selected.push(select); }

      delete query.$select;
    }

    return this.schema()
      .then(bucket => new Promise((resolve, reject) => {
        bucket.query(
          this._buildN1QL(couchbase, queryStr, consistency, true),
          values,
          (err, result, meta) => {
            if (err) { return void reject(err); }

            return void resolve([result, meta]);
          });
      })
        .then(([results, queryData]) => {
          if (selected.length > 0) {
            results = this._stripKeys(selected, results);
          }

          if (!paginate.default) { return results; }

          return {
            total: queryData.metrics.resultCount,
            limit: query.$limit,
            skip: query.$skip != null ? query.$skip : 0,
            data: results
          };
        })
      );
  }

  /**
   * FeathersJS Service Find
   * @param params
   * @returns {bluebird}
   */
  find (params) {
    return new Promise((resolve, reject) => {
      if (params == null) {
        throw new BadRequest('Null passed to find');
      }

      const { query } = params;
      const paginate = (params && typeof params.paginate !== 'undefined') ? params.paginate : this.paginate;

      if (query == null) {
        throw new BadRequest('Null query object passed');
      }

      query._type = this.opts.name;

      if (paginate.default) {
        if (query.$limit == null) { query.$limit = paginate.default; }

        query.$limit = R.clamp(0, paginate.max)(query.$limit);
      }

      let consistency = query.$consistency;
      if ('$consistency' in query) { delete query.$consistency; }

      resolve(this._find(query, paginate, consistency));
    });
  }

  /**
   * FeathersJS Service Get
   * @param id
   * @param params
   * @returns {Promise}
   */
  get (id, params) {
    return this.schema()
      .then(bucket => new Promise((resolve, reject) => {
        bucket.get(this._key(id), (err, result) => {
          if (err) { return void reject(err); }

          return void resolve(result);
        });
      })
        .then((element) => {
          /* istanbul ignore next */
          if (element == null) throw new NotFound('Does not exist');

          /* istanbul ignore next */
          return element.value || element;
        })
        .catch(this._handleError)
      );
  }

  /**
   * FeathersJS Service Create
   * @param data
   * @param params
   * @returns {bluebird}
   */
  create (data, params) {
    return new Promise((resolve, reject) => {
      if (data == null) {
        return void reject(new BadRequest('No data passed to create'));
      }

      if (Array.isArray(data) && !this._isMultiAllowed('create')) {
        throw new BadRequest('Multi-access is not enabled for this service method');
      }

      if (Array.isArray(data)) {
        return void resolve(Promise.map(data, (_data) => {
          return this.create(_data, params);
        }));
      }

      data._type = this.opts.name;

      return void resolve(
        this.schema()
          .then(bucket => new Promise((resolve, reject) => {
            bucket.insert(this._key(this._id(data)), data, (err, result) => {
              if (err) { return void reject(err); }

              return void resolve(result);
            });
          })
            .then(() => this.get(this._id(data), params)))
      );
    });
  }

  /**
   * FeathersJS Service Update
   * @param id
   * @param data
   * @param params
   * @returns {Promise}
   */
  update (id, data, params) {
    return new Promise((resolve) => {
      if (id == null) {
        throw new BadRequest('ID cannot be null for update');
      }

      return void resolve(this.get(id, params)
        .then(
          _obj => this.schema()
            .then((bucket) => {
              // Keep id field intact upon updates
              const newObject = Object.assign(
                Object.assign({ [this.id]: _obj[this.id] }, data),
                { _type: this.opts.name }
              );

              return new Promise((resolve, reject) => {
                bucket.replace(this._key(id), newObject, (err, result) => {
                  if (err) { return void reject(err); }

                  return void resolve(result);
                });
              });
            })
        )
        .then(() => this.get(id, params))
        .catch(this._handleError)
      );
    });
  }

  /**
   * FeathersJS Service Patch
   * @param id
   * @param data
   * @param params
   * @returns {Promise}
   */
  patch (id, data, params) {
    return new Promise((resolve) => {
      if (id == null && (params || {}).query && !this._isMultiAllowed('patch')) {
        throw new BadRequest('Multi-access is not enabled for this service method');
      } else if (id == null && this._isMultiAllowed('patch')) {
        throw new NotImplemented('Service adapter does not support multi-patch at current time');
      }

      return void resolve(
        this.get(id, params)
          .then(
            _obj => this.schema()
              .then(bucket => new Promise((resolve, reject) => {
                bucket.replace(
                  this._key(id),
                  Object.assign(Object.assign(_obj, data), { _type: this.opts.name }),
                  (err, result) => {
                    if (err) { return void reject(err); }

                    return void resolve(result);
                  }
                );
              })
              )
          )
          .then(() => this.get(id, params))
          .catch(this._handleError)
      );
    });
  }

  /**
   * FeathersJS Service Remove
   * @param id
   * @param params
   */
  remove (id, params) {
    return new Promise((resolve) => {
      if (id == null && (params || {}).query && !this._isMultiAllowed('remove')) {
        throw new BadRequest('Multi-access is not enabled for this service method');
      } else if (id == null && this._isMultiAllowed('remove')) {
        throw new NotImplemented('Service adapter does not support multi-remove at current time');
      }

      return void resolve(
        this.get(id, params)
          .then((data) => this.schema()
            .then(bucket => new Promise((resolve, reject) => {
              bucket.remove(this._key(this._id(data)), (err, result) => {
                if (err) { return void reject(err); }

                return void resolve(result);
              });
            }))
            .then((resp) => {
              if ((params || {}).$return === false) {
                return resp;
              }

              return data;
            })
          )
          .catch(this._handleError)
      );
    });
  }
}

module.exports = Service;
