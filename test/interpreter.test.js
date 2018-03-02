'use strict';

/* eslint no-unused-expressions: 0 */

const { expect } = require('chai');
const { QueryInterpreter } = require('../lib');

const { interpret } = QueryInterpreter;
const {
  Directive,
  SingleValueDirective,
  FieldValueDirective,
  SpecialDirective
} = QueryInterpreter;

describe('FeathersJS Query Interpreter', () => {
  it('Should interpret basic equality', () => {
    const components = interpret({ one: 1 });

    expect(components).to.be.ok;
    expect(components).to.have.length(1);

    const component = components[0];
    expect(component).to.be.instanceOf(SingleValueDirective);
    expect(component.directive).to.be.instanceOf(Directive);
    expect(component.directive.type).to.be.equal('and');

    const andComponents = component.value;
    expect(andComponents).to.have.length(1);

    const eqComponent = andComponents[0];

    expect(eqComponent.value).to.be.equal(1);
    expect(eqComponent.field).to.be.equal('one');
  });

  it('Should interpret and of two equalities', () => {
    const components = interpret({
      one: 1,
      two: 2
    });

    expect(components).to.be.ok;
    expect(components).to.have.length(1);

    const component = components[0];
    expect(component).to.be.instanceOf(SingleValueDirective);
    expect(component.directive).to.be.instanceOf(Directive);
    expect(component.directive.type).to.be.equal('and');

    const andComponents = component.value;
    expect(andComponents).to.have.length(2);
  });

  it('Should interpret $limit', () => {
    const components = interpret({
      $limit: 5
    });

    expect(components).to.be.ok;
    expect(components).to.have.length(1);

    const component = components[0];
    expect(component).to.be.instanceOf(SingleValueDirective);
    expect(component.directive).to.be.instanceOf(Directive);
    expect(component.directive.type).to.be.equal('limit');
    expect(component.value).to.be.equal(5);
  });

  it('Should interpret $skip', () => {
    const components = interpret({
      $skip: 5
    });

    expect(components).to.be.ok;
    expect(components).to.have.length(1);

    const component = components[0];
    expect(component).to.be.instanceOf(SingleValueDirective);
    expect(component.directive).to.be.instanceOf(Directive);
    expect(component.directive.type).to.be.equal('skip');
    expect(component.value).to.be.equal(5);
  });

  it('Should interpret $select', () => {
    const components = interpret({
      $select: ['field1', 'field2']
    });

    expect(components).to.be.ok;
    expect(components).to.have.length(1);

    const component = components[0];
    expect(component).to.be.instanceOf(SingleValueDirective);
    expect(component.directive).to.be.instanceOf(Directive);
    expect(component.directive.type).to.be.equal('select');
    expect(component.value).to.deep.equal(['field1', 'field2']);
  });

  it('Should interpret $sort', () => {
    const components = interpret({
      $sort: {
        sorted: 1,
        downsort: -1
      }
    });

    expect(components).to.be.ok;
    expect(components).to.have.length(1);

    const component = components[0];
    expect(component).to.be.instanceOf(SingleValueDirective);
    expect(component.directive).to.be.instanceOf(Directive);
    expect(component.directive.type).to.be.equal('sort');

    const sortComponent = component.value;
    expect(sortComponent).to.have.length(2);
    expect(sortComponent).to.deep.equal([
      {field: 'sorted', value: 1},
      {field: 'downsort', value: -1}
    ]);
  });

  function testClause (clause, value = 2) {
    return () => {
      const query = { one: {} };
      query.one['$' + clause] = value;
      const components = interpret(query);

      expect(components).to.be.ok;
      expect(components).to.have.length(1);

      const component = components[0];
      expect(component).to.be.instanceOf(SingleValueDirective);
      expect(component.directive).to.be.instanceOf(Directive);
      expect(component.directive.type).to.be.equal('and');

      const andComponents = component.value;
      expect(andComponents).to.have.length(1);

      const $clauseComponent = andComponents[0];

      expect($clauseComponent).to.be.instanceOf(FieldValueDirective);
      expect($clauseComponent.directive.type).to.have.equal(clause);
      expect($clauseComponent.field).to.have.equal('one');
      if (Array.isArray(value)) {
        expect($clauseComponent.value).to.deep.equal(value);
      } else {
        expect($clauseComponent.value).to.have.equal(value);
      }
    };
  }

  it('Should interpret $lt subclause', testClause('lt'));
  it('Should interpret $lte subclause', testClause('lte'));
  it('Should interpret $gt subclause', testClause('gt'));
  it('Should interpret $gte subclause', testClause('gte'));
  it('Should interpret $in subclause', testClause('in', [10, 1]));
  it('Should interpret $nin subclause', testClause('nin', [10, 1]));

  it('Should compound subclauses to `and` query', () => {
    const query = {
      one: { $lt: 10, $gt: 5 }
    };
    const components = interpret(query);

    expect(components).to.be.ok;
    expect(components).to.have.length(1);

    const component = components[0];
    expect(component).to.be.instanceOf(SingleValueDirective);
    expect(component.directive).to.be.instanceOf(Directive);
    expect(component.directive.type).to.be.equal('and');

    const andComponents = component.value;
    expect(andComponents).to.have.length(1);

    const groupComponent = andComponents[0];

    const $ltComponent = groupComponent[0];
    const $gtComponent = groupComponent[1];

    function checkComponent (comp, clause) {
      expect(comp).to.be.instanceOf(FieldValueDirective);
      expect(comp.directive.type).to.have.equal(clause);
      expect(comp.field).to.have.equal('one');
    }

    checkComponent($ltComponent, 'lt');
    checkComponent($gtComponent, 'gt');
  });

  it('Should interpret $or query', () => {
    const components = interpret({
      $or: [
        { one: 1 },
        { thing: { $ne: 2 } }
      ]
    });

    expect(components).to.be.ok;
    expect(components).to.have.length(1);

    const component = components[0];
    expect(component).to.be.instanceOf(SingleValueDirective);
    expect(component.directive).to.be.instanceOf(Directive);
    expect(component.directive.type).to.be.equal('or');

    const orComponents = component.value;
    expect(orComponents).to.have.length(2);

    // For each component of $or it is possibly multiple queries `AND` together
    const firstOR = orComponents[0];
    expect(firstOR).to.be.instanceOf(SingleValueDirective);
    expect(firstOR.directive.type).to.be.equal('and');

    const oneComponent = firstOR.value;
    expect(oneComponent.field).to.be.equal('one');
    expect(oneComponent.value).to.be.equal(1);

    // For each component of $or it is possibly multiple queries `AND` together
    const secondOR = orComponents[1];
    expect(secondOR).to.be.instanceOf(SingleValueDirective);
    expect(secondOR.directive.type).to.be.equal('and');

    const twoComponent = secondOR.value;
    expect(twoComponent).to.be.instanceOf(SingleValueDirective);
    expect(twoComponent.directive.type).to.be.equal('ne');

    expect(twoComponent.field).to.be.equal('thing');
    expect(twoComponent.value).to.be.equal(2);
  });

  it('Should interpret special directives', () => {
    const components = interpret({
      one: 1,
      $consistency: 0
    });

    expect(components).to.be.ok;
    expect(components).to.have.length(2);

    console.log(components);
    const special = components[0];
    expect(special).to.be.instanceOf(SpecialDirective);
    expect(special.directive.type).to.be.equal('consistency');
    expect(special.value).to.be.equal(0);
  });
});
