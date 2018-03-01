'use strict';

/* eslint no-unused-expressions: 0 */

const expect = require('chai').expect;
const sinon = require('sinon');

// const Promise = require('bluebird');
const { BadRequest, NotFound } = require('@feathersjs/errors');
const couchbase = require('couchbase-promises').Mock;
const CouchService = require('../lib');

describe('Couchbase Adapter', function () {
  const bucketName = 'testbucket';
  const Cluster = new couchbase.Cluster(`couchbase://localhost`);
  const Bucket = Cluster.openBucket(bucketName, bucketName);

  /**
   * @type {CouchService | null}
   */
  let Service = null;

  beforeEach(() => {
    Service = new CouchService({
      couchbase: couchbase,
      bucket: 'testbucket',
      connection: Bucket,
      name: 'users',
      id: 'uuid'
    });
  });

  it('Should setup', () => {
    Service.setup({}, 'path');
  });

  it('Should error if parameters are missing', () => {
    const params = {
      couchbase: couchbase,
      bucket: 'testbucket',
      connection: Bucket,
      name: 'users'
    };

    for (let param in params) {
      const value = params[param];

      delete params[param];

      expect(() => new CouchService(params), `Parameter ${param} not expected to exist`).to.throw();

      params[param] = value;
    }
  });

  it('Should create couchservice', () => {
    expect(Service).to.be.ok;
  });

  it('Should not find key if never created', () => {
    const spy = sinon.spy();

    return Service.get('a')
      .catch((err) => {
        expect(err).to.be.instanceOf(NotFound);
        spy();
      })
      .then(() => expect(spy.called, 'Error not thrown').to.be.true);
  });

  it('Should error when given no data to create', () => {
    return Service.create()
      .then(() => { throw new Error('Should not happen'); })
      .catch((err) => {
        expect(err).to.be.instanceOf(BadRequest);
      });
  });

  it('Should create data', () => {
    const data = {
      id: 'foo',
      foo: 'bar'
    };
    return Service.create(data)
      .then((el) => {
        expect(el.id).to.equal(data.id);
        expect(el.foo).to.equal(data.foo);
      });
  });

  it('Should create and retrieve data', () => {
    const data = {
      id: 'foo',
      foo: 'bar'
    };
    return Service.create(data)
      .then((el) =>
        Service.get(data.uuid)
          .then((el2) => {
            expect(el.id).to.equal(data.id);
            expect(el.foo).to.equal(data.foo);
            expect(el.id).to.equal(el2.id);
            expect(el.foo).to.equal(el2.foo);
          })
      );
  });

  it('Should remove created data', () => {
    const data = {
      id: 'foo',
      foo: 'bar'
    };
    return Service.create(data)
      .then((el) => {
        expect(el.id).to.equal(data.id);
        expect(el.foo).to.equal(data.foo);

        return Service.remove(data.uuid)
          .then(Service.get(data.uuid))
          .catch((err) => { expect(err).to.be.instanceOf(NotFound); });
      });
  });

  it('Should patch data', () => {
    const data = {
      id: 'foo',
      foo: 'bar'
    };
    return Service.create(data)
      .then(() => {
        const reversed = data.foo.split().reverse().join('');
        return Service.patch(data.uuid, { foo: reversed })
          .then((el) => {
            expect(el.id).to.equal(data.id);
            expect(el.foo).to.equal(reversed);
          });
      });
  });

  it('Should update data', () => {
    const data = {
      id: 'foo',
      foo: 'bar'
    };
    return Service.create(data)
      .then(() => {
        const reversed = data.foo.split().reverse().join('');
        return Service.update(data.uuid, { foo: reversed })
          .then((el) => {
            expect(el.id).to.equal(data.id);
            expect(el.foo).to.equal(reversed);
          });
      });
  });
});
