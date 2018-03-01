'use strict';

/* eslint no-unused-expressions: 0 */

const { expect } = require('chai');
const { QueryBuilder } = require('../lib');

describe('Couchbase QueryBuilder Where Clauses', () => {
  /**
   *
   * @type {QueryBuilder}
   */
  let Query = null;

  beforeEach(() => void (Query = new QueryBuilder()));

  it('Should build where query', () => {
    const $query = {
      roomId: {
        $in: [2, 5]
      }
    };

    Query.interpret($query);

    const { query, values } = Query.build();

    expect(query).to.be.ok;
    expect(query).to.include('WHERE');
    expect(query).to.include('IN');
    expect(values).to.include($query.roomId.$in);
  });

  it('Should represent null correctly', () => {
    const $query = {
      roomId: null
    };

    Query.interpret($query);

    const { query } = Query.build();

    expect(query).to.be.ok;
    expect(query).to.include('WHERE');
    expect(query).to.include('NULL');
  });

  it('Should understand $gt query', () => {
    const $query = {
      roomId: {
        $gt: 1
      }
    };

    Query.interpret($query);

    const { query } = Query.build();

    expect(query).to.be.ok;
    expect(query).to.include('>');
  });

  it('Should understand $gte query', () => {
    const $query = {
      roomId: {
        $gte: 1
      }
    };

    Query.interpret($query);

    const { query } = Query.build();

    expect(query).to.be.ok;
    expect(query).to.include('>=');
  });

  it('Should understand $lt query', () => {
    const $query = {
      roomId: {
        $lt: 1
      }
    };

    Query.interpret($query);

    const { query } = Query.build();

    expect(query).to.be.ok;
    expect(query).to.include('<');
  });

  it('Should understand $lte query', () => {
    const $query = {
      roomId: {
        $lte: 1
      }
    };

    Query.interpret($query);

    const { query } = Query.build();

    expect(query).to.be.ok;
    expect(query).to.include('<=');
  });

  it('Should understand $in Query', () => {
    const $query = {
      roomId: {
        $in: [2, 5]
      }
    };

    Query.interpret($query);

    const { query, values } = Query.build();

    expect(query).to.be.ok;
    expect(query).to.include('IN');
    expect(values).to.include($query.roomId.$in);
  });

  it('Should understand $nin Query', () => {
    const $query = {
      roomId: {
        $nin: [2, 5]
      }
    };

    Query.interpret($query);

    const { query, values } = Query.build();

    expect(query).to.be.ok;
    expect(query).to.include('NOT IN');
    expect(values).to.include($query.roomId.$nin);
  });

  it('Should understand $ne Query', () => {
    const $query = {
      roomId: {
        $ne: true
      }
    };

    Query.interpret($query);

    const { query } = Query.build();

    expect(query).to.be.ok;
    expect(query).to.include('!=');
  });

  it('Should understand attributes', () => {
    const $query = {
      roomId: 3
    };

    Query.interpret($query);

    const { query, values } = Query.build();

    expect(query).to.be.ok;
    expect(query).to.include('=');
    expect(values).to.include($query.roomId);
    expect(query).to.include('roomId');
  });

  it('Should throw error for $or', () => {
    const $query = {
      $or: [
        {roomId: {$ne: true}},
        {val: 3}
      ]
    };

    Query.interpret($query);

    expect(() => Query.build()).to.throw();

    /*
    const { query } = Query.build();
    expect(query).to.be.ok;
    expect(query).to.include('OR');
    */
  });
});
