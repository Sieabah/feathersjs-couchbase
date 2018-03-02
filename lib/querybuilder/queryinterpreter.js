'use strict';

const directiveRegex = /^\$([a-zA-Z]+)$/;

class DirectiveComponent {
  constructor (directive) {
    this.directive = new Directive(directive);
  }
}

class SingleValueDirective extends DirectiveComponent {
  constructor (directive, value) {
    super(directive);
    this.value = value;
  }

  toString () {
    return this.directive.compile(this.value);
  }
}

class SpecialDirective extends SingleValueDirective {}

class FieldValueDirective extends SingleValueDirective {
  constructor (directive, field, value) {
    super(directive, value);
    this.field = field;
  }

  toString () {
    return this.directive.compile(this.value, this.field);
  }
}

function determineWhereClause (field, segments) {
  const whereDirectives = ['in', 'nin', 'lt', 'lte', 'gt', 'gte', 'ne'];
  const components = [];

  if (segments != null && (Array.isArray(segments) || typeof segments === 'object')) {
    for (let component in segments) {
      /* istanbul ignore next */
      if (!segments.hasOwnProperty(component)) continue;

      const directive = Directive.isDirective(component);

      /* istanbul ignore next */
      if (directive === 'or') {
        components.push(directives.or(segments[component]));
      } else if (~whereDirectives.indexOf(directive)) {
        components.push(new FieldValueDirective(directive, field, segments[component]));
      } else if (directive != null) {
        /* Ignore invalid directive */
      } else {
        components.push(new FieldValueDirective('eq', field, segments[component]));
      }
    }
  } else {
    components.push(new FieldValueDirective('eq', field, segments));
  }

  return components.length === 1 ? components[0] : components;
}

const directives = {
  limit: (value) => new SingleValueDirective('limit', value),
  skip: (value) => new SingleValueDirective('skip', value),
  select: (values) => new SingleValueDirective('select', values),
  sort: (values) => {
    const sorted = [];
    for (let key in values) {
      /* istanbul ignore next */
      if (!values.hasOwnProperty(key)) continue;
      const directive = Directive.isDirective(key);
      if (directive) continue;

      sorted.push({ field: key, value: values[key] });
    }

    return new SingleValueDirective('sort', sorted);
  },
  or: (values) => {
    const components = [];
    for (let component of values) {
      for (let field in component) {
        /* istanbul ignore next */
        if (!component.hasOwnProperty(field)) continue;

        const directive = Directive.isDirective(field);

        /* istanbul ignore if */
        if (directive === 'or') {
          components.push(directives.or(component[field]));
        } else if (directive) {
          // Ignore invalid directive
        } else {
          components.push(new SingleValueDirective('and', determineWhereClause(field, component[field])));
        }
      }
    }

    return new SingleValueDirective('or', components);
  }
};

class Directive {
  constructor (type) {
    this._type = type;
  }

  static isDirective (value) {
    const found = value.match(directiveRegex);

    return found ? found[1] : null;
  }

  get type () {
    return this._type;
  }

  compile (value, field) {
    switch (this.type) {
      case 'lt':
        return `\`${field}\` < ${value}`;
      case 'lte':
        return `\`${field}\` <= ${value}`;
      case 'gt':
        return `\`${field}\` > ${value}`;
      case 'gte':
        return `\`${field}\` >= ${value}`;
      case 'ne':
        return `\`${field}\` != ${value}`;
      case 'eq':
        return `\`${field}\` = ${value || 'NULL'}`;
      case 'in':
        return `\`${field}\` IN ${value}`;
      case 'nin':
        return `\`${field}\` NOT IN ${value}`;
      default:
        return value;
    }
  }
}

function interpretQuery (query) {
  const components = [];
  const where = [];
  for (let key in query) {
    /* istanbul ignore next */
    if (!query.hasOwnProperty(key)) {
      continue;
    }

    const directive = Directive.isDirective(key);

    if (directive) {
      if (directive in directives) {
        let arr = components;
        if (directive === 'or') { arr = where; }

        arr.push(directives[directive](query[key]));
      } else {
        components.push(new SpecialDirective(directive, query[key]));
      }
    } else {
      if (query[key] != null && typeof query[key] === 'object' && !Array.isArray(query[key])) {
        where.push(determineWhereClause(key, query[key]));
      } else {
        where.push(new FieldValueDirective('eq', key, query[key]));
      }
    }
  }

  if (where.length > 0) {
    components.push(new SingleValueDirective('and', where));
  }

  return components;
}

module.exports = {
  interpret: ($query) => interpretQuery($query),
  Directive,
  DirectiveComponent,
  FieldValueDirective,
  SingleValueDirective,
  SpecialDirective
};
