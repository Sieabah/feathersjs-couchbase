'use strict';

/* eslint no-unused-expressions: 0 */

const { expect } = require('chai');
const { QueryBuilder, QueryError } = require('../lib');

describe('Couchbase QueryBuilder', () => {
  /**
   *
   * @type {QueryBuilder}
   */
  let Query = null;

  beforeEach(() => void (Query = new QueryBuilder()));

  it('Adds select query', () => {
    Query.select('*');

    const { query } = Query.build();

    expect(query).to.be.ok;
    expect(query).to.be.a('string');
    expect(query).to.include('SELECT');
    expect(query).to.include('*');
  });

  it('Adds select query', () => {
    const { query } = Query.build();

    expect(query).to.be.ok;
    expect(query).to.be.a('string');
    expect(query).to.include('SELECT');
    expect(query).to.include('*');
  });

  it('Joins multiple selected fields', () => {
    Query.select('name', 'username');

    const { query } = Query.build();

    expect(query).to.be.ok;
    expect(query).to.not.include('*');
    expect(query).to.include('name,username');
  });

  it('Should have default wildcard select', () => {
    const { query } = Query.build();

    expect(query).to.be.ok;
    expect(query).to.be.a('string');
    expect(query).to.include('SELECT');
    expect(query).to.include('*');
  });

  it('Should bucket-scope select statements', () => {
    Query = new QueryBuilder('testbucket');
    Query.select('one', 'two');

    const { query } = Query.build();

    expect(query).to.be.ok;
    expect(query).to.include('`testbucket`.one');
  });

  it('Should bucket-scope wildcard', () => {
    Query = new QueryBuilder('testbucket');
    Query.select('*');

    const { query } = Query.build();

    expect(query).to.be.ok;
    expect(query).to.include('`testbucket`.*');
  });

  it('Should bucket-scope default wildcard', () => {
    Query = new QueryBuilder('testbucket');

    const { query } = Query.build();

    expect(query).to.be.ok;
    expect(query).to.include('`testbucket`.*');
  });

  it('Should apply bucket late from `from` statement', () => {
    Query.from('testbucket');

    const { query } = Query.build();

    expect(query).to.be.ok;
    expect(query).to.include('`testbucket`.*');
  });

  it('Should append overwrite selects from initial query', () => {
    Query.select('one');
    Query.select('two');

    const { query } = Query.build();

    expect(query).to.include('two');
    expect(query).to.not.include('one');
  });

  it('Should add fail on empty skip parameter', () => {
    expect(() => Query.skip()).to.throw(QueryError);
  });

  it('Should add skip parameter', () => {
    Query.skip(1);

    const { query } = Query.build();

    expect(query).to.include('SELECT');
    expect(query).to.include('OFFSET');
    expect(query).to.include(1);
  });

  it('Should interpret skip', () => {
    Query.interpret({
      $skip: 1
    });

    const { query } = Query.build();
    expect(query).to.include('OFFSET');
    expect(query).to.include(1);
  });

  it('Should add fail on empty limit parameter', () => {
    expect(() => Query.limit()).to.throw(QueryError);
  });

  it('Should add limit parameter', () => {
    Query.limit(1);

    const { query } = Query.build();

    expect(query).to.include('SELECT');
    expect(query).to.include('LIMIT');
    expect(query).to.include(1);
  });

  it('Should handle complex where', () => {
    console.log('COMPLEX WHERE');
    Query.interpret({
      room: {
        uuid: '11111111',
        subobj: {
          third: 5,
          six: 6,
          super: {
            nested: {
              results: {
                value1: 1,
                value2: 2
              }
            }
          }
        },
        name: '22222222',
        owner: '333333333',
        private: false,
        scenes: [
          'one',
          'two'
        ],
        volume: 1.0,
        _type: 'rooms',
        updatedAt: '77777777'
      }
    });

    const { query } = Query.build();
    
    expect(query).to.be.ok;
    expect(query).to.include('`room.uuid`');
    expect(query).to.include('`room.subobj.third`');
    expect(query).to.include('`room.subobj.six`');
    expect(query).to.include('`room.subobj.super.nested.results.value1`');
    expect(query).to.include('`room.subobj.super.nested.results.value2`');
  });

  it('Should interpret limits', () => {
    Query.interpret({
      $limit: 1
    });

    const { query } = Query.build();
    expect(query).to.include('LIMIT');
    expect(query).to.include(1);
  });

  it('Limit should not fail with numeric string', () => {
    Query.limit('1');

    const { query } = Query.build();

    expect(query).to.include('SELECT');
    expect(query).to.include('LIMIT');
    expect(query).to.include(1);
  });

  it('Limit should fail with non-numeric string', () => {
    Query.limit('foo');

    expect(() => Query.build()).to.throw(QueryError);
  });

  it('Skip should not fail with numeric string', () => {
    Query.skip('1');

    const { query } = Query.build();

    expect(query).to.include('SELECT');
    expect(query).to.include('OFFSET');
    expect(query).to.include(1);
  });

  it('Skip should fail with non-numeric string', () => {
    Query.skip('foo');

    expect(() => Query.build()).to.throw(QueryError);
  });

  it('Should skip and limit', () => {
    Query.skip(5);
    Query.limit(5);

    const { query } = Query.build();

    expect(query).to.include('LIMIT');
    expect(query).to.include('OFFSET');
    expect(query).to.include('SELECT');
  });

  it('Should interpret limit & skip', () => {
    Query.interpret({
      $limit: 1,
      $skip: 1
    });

    const { query } = Query.build();

    expect(query).to.include('LIMIT');
    expect(query).to.include('OFFSET');
    expect(query).to.include('SELECT');
  });

  it('Should add sort trait', () => {
    Query.sort('age');

    const { query, values } = Query.build();

    expect(query).to.include('ORDER BY');
    expect(values).to.include('age');
    expect(query).to.include('ASC');
  });

  it('Should add sort on many traits', () => {
    Query.sort(['age', 'name']);

    const { query, values } = Query.build();

    expect(query).to.include('ORDER BY');
    expect(values).to.include('age');
    expect(query).to.include('ASC');
  });

  it('Should interpret sorting', () => {
    Query.interpret({
      $sort: {
        age: 1,
        name: -1
      }
    });

    const { query, values } = Query.build();

    expect(query).to.include('ORDER BY');
    expect(values).to.include('age');
    expect(query).to.include('ASC');
  });

  it('Should throw error when passed nothing', () => {
    expect(() => Query.sort()).to.throw(QueryError);
  });

  it('Should have desc order', () => {
    Query.sort('age', 'desc');

    const { query } = Query.build();

    expect(query).to.be.ok;
    expect(query).to.include('DESC');
  });

  it('Should error when not asc or desc order', () => {
    expect(() => Query.sort('age', 'upwards')).to.throw(QueryError);
  });
});
