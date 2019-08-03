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

  describe('QueryBuild', () => {
    it('Should build where query', () => {
      Query.where('foo', 'eq', 'bar');

      const built = Query.build();
      const { query, values } = built;

      expect(query).to.be.ok;
      expect(query).to.include('WHERE');
      expect(query).to.include('foo');
      expect(query).to.include('=');
      expect(values).to.include('bar');
    });

    it('Should recast null to NULL', () => {
      Query.where('foo', 'eq', null);

      const built = Query.build();
      const { query, values } = built;

      expect(query).to.be.ok;
      expect(query).to.include('WHERE');
      expect(query).to.include('foo');
      expect(query).to.include('NULL');
      expect(values).to.have.length(0);
    });

    function testDirective (name, symbol, values = 1) {
      it(`Should build ${name} query`, () => {
        Query.where('foo', name, 1);

        const built = Query.build();
        const { query, values } = built;

        expect(query).to.be.ok;
        expect(query).to.include('WHERE');
        expect(query).to.include('foo');
        expect(query).to.include(symbol);
        if (Array.isArray(values)) {
          expect(values).to.deep.equal(values);
        } else {
          expect(values).to.include(values);
        }
      });
    }

    testDirective('ne', '!=');
    testDirective('lt', '<');
    testDirective('lte', '<=');
    testDirective('gt', '>');
    testDirective('gte', '>=');
    testDirective('in', 'IN', [10, 1]);
    testDirective('nin', 'NOT IN', [10, 1]);

    it('Should not build or', () => {
      Query.where(null, 'or', [{ foo: 1 }, { bar: 2 }]);

      expect(() => Query.build()).to.throw();
    });
  });

  describe('QueryInspect', () => {
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

    it('Should understand empty $in Query', () => {
      const $query = {
        roomId: {
          $in: []
        }
      };

      Query.interpret($query);

      const { query, values } = Query.build();

      expect(query).to.be.ok;
      expect(query).to.include('IN');
      expect(values).to.include($query.roomId.$in);
    });

    it('Should reject bad root directives Query', () => {
      const badDirectives = ['lt', 'lte', 'gt', 'gte', 'ne', 'in', 'nin', 'eq'];

      for (let directive of badDirectives) {
        expect(() => {
          const $query = {};
          $query[`$${directive}`] = [];

          Query.interpret($query);
        }).to.throw();
      }
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
          { roomId: { $ne: true } },
          { val: 3 }
        ]
      };

      Query.interpret($query);

      const { query, values } = Query.build();

      expect(query).to.be.ok;
      expect(query).to.include('OR');
      expect(query).to.include('!=');
      expect(values).to.deep.equal([true, 3]);
    });
  });
});
