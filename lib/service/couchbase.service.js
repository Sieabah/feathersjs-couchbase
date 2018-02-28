'use strict';

const { NotFound } = require('@feathersjs/errors');
const { keyNotFound } = require('couchbase').errors;
const { QueryBuilder } = require('../querybuilder');
const uuid = require('uuid/v4');
const R = require('ramda');

class Service {
  constructor (opts) {
    this.opts = opts || {};

    if (this.opts.couchbase == null) { throw new Error('Must pass couchbase library'); }

    if (this.opts.bucket == null) { throw new Error('Must pass bucket name'); }

    if (this.opts.connection == null) { throw new Error('Must pass bucket connection'); }

    if (this.opts.name == null) { throw new Error('Name of service must be specified'); }

    this.id = opts.id || 'uuid';
    this.paginate = opts.paginate || {};
  }

  setup (app, path) {
    this.app = app;
    this.path = path;
  }

  schema () {
    return this.opts.connection;
  }

  _key (key = '') {
    return [this.opts.name || '', key].join(this.opts.separator || '::');
  }

  _id (data) {
    if (!(this.id in data)) { data[this.id] = uuid(); }

    return data[this.id];
  }

  find (params) {
    const { query } = params;
    const { couchbase } = this.opts;
    const paginate = (params && typeof params.paginate !== 'undefined') ? params.paginate : this.paginate;

    query._type = this.opts.name;

    if (paginate.default) {
      if (query.$limit == null) { query.$limit = paginate.default; }

      query.$limit = R.clamp(0, paginate.max)(query.$limit);
    }

    let selected = [];

    if (query.$select) {
      for (let select of query.$select) { selected.push(select); }

      delete query.$select;
    }

    const { query: queryStr, values } = (new QueryBuilder(this.opts.bucket)).interpret(query).build();

    return this.schema()
      .then(bucket => bucket
        .queryAsync(couchbase.N1qlQuery.fromString(queryStr), values)
        .then(([results, queryData]) => {
          if (selected.length > 0) {
            results = results.map(a => {
              const result = {};
              for (let key in a) {
                if (a.hasOwnProperty(key) && key in selected) { result[key] = a[key]; }
              }

              return result;
            });
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

  get (id, params) {
    return this.schema()
      .then(bucket => bucket
        .getAsync(this._key(id))
        .then((element) => {
          if (element == null) throw new NotFound('Does not exist');
          return element.value || element;
        })
        .catch(err => {
          if (err.code === keyNotFound) { throw new NotFound('Does not exist'); }

          throw err;
        })
      );
  }

  create (data, params) {
    data._type = this.opts.name;
    return this.schema()
      .then(bucket => bucket
        .insertAsync(this._key(this._id(data)), data)
        .then(() => this.get(this._id(data), params))
      );
  }

  update (id, data, params) {
    return this.patch(id, data, params);
  }

  patch (id, data, params) {
    return this.get(id, params)
      .then(
        _obj => this.schema()
          .then(bucket => bucket
            .replaceAsync(this._key(id), Object.assign(Object.assign(_obj, data), { _type: this.opts.name }))
          )
      )
      .then(() => this.get(id, params));
  }

  remove (id, params) {
    return this.get(id, params)
      .then((data) => this.schema()
        .then(bucket => bucket.removeAsync(this._key(this._id(data))))
      );
  }
}

module.exports = Service;
