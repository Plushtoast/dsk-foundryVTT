/**
 * Base DataModel class for DSK system
 * Provides mixin support for template composition
 */
export class DSKDataModel extends foundry.abstract.TypeDataModel {
  static _schemaTemplates = [];

  static _immiscible = new Set([
    'length',
    'mixed',
    'name',
    'prototype',
    'cleanData',
    '_cleanData',
    '_initializationOrder',
    'validateJoint',
    '_validateJoint',
    'migrateData',
    '_migrateData',
    'shimData',
    '_shimData',
    'defineSchema',
  ]);

  static defineSchema() {
    const schema = {};
    for (const template of this._schemaTemplates) {
      if (!template.defineSchema) {
        throw new Error(`Invalid dsk template mixin ${template} defined on class ${this.constructor}`);
      }
      this.mergeSchema(schema, template.defineSchema());
    }
    return schema;
  }

  static get _schemaTemplateFields() {
    const fieldNames = Object.freeze(new Set(this._schemaTemplates.map((t) => t.schema.keys()).flat()));
    Object.defineProperty(this, '_schemaTemplateFields', {
      value: fieldNames,
      writable: false,
      configurable: false,
    });
    return fieldNames;
  }

  static *_initializationOrder() {
    for (const template of this._schemaTemplates) {
      for (const entry of template._initializationOrder()) {
        entry[1] = this.schema.get(entry[0]);
        yield entry;
      }
    }
    for (const entry of this.schema.entries()) {
      if (this._schemaTemplateFields.has(entry[0])) continue;
      yield entry;
    }
  }

  static mergeSchema(a, b) {
    Object.assign(a, b);
    return a;
  }

  static cleanData(source, options, _state) {
    this._cleanData(source, options, _state);
    return super.cleanData(source, options, _state);
  }

  static _cleanData(source, options, _state) {
    for (const template of this._schemaTemplates) {
      template._cleanData(source, options, _state);
    }
  }

  static validateJoint(data, options, _state) {
    this._validateJoint(data, options, _state);
    return super.validateJoint(data, options, _state);
  }

  static _validateJoint(data, options, _state) {
    for (const template of this._schemaTemplates) {
      template._validateJoint(data, options, _state);
    }
  }

  static migrateData(source, options, _state) {
    this._migrateData(source, options, _state);
    return super.migrateData(source, options, _state);
  }

  static _migrateData(source, options, _state) {
    for (const template of this._schemaTemplates) {
      template._migrateData(source, options, _state);
    }
  }

  static #collectDescriptors(target, stopAt, skip = new Set()) {
    const descriptors = new Map();
    let current = target;

    while (current && current !== stopAt) {
      for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(current))) {
        if (skip.has(key) || descriptors.has(key)) continue;
        descriptors.set(key, descriptor);
      }
      current = Object.getPrototypeOf(current);
    }

    return descriptors;
  }

  static mixin(...templates) {
    for (const template of templates) {
      if (!(template.prototype instanceof DSKDataModel)) {
        throw new Error(`${template.name} is not a subclass of DSKDataModel`);
      }
    }

    const Base = class extends this {};
    Object.defineProperty(Base, '_schemaTemplates', {
      value: Object.seal([...this._schemaTemplates, ...templates]),
      writable: false,
      configurable: false,
    });

    for (const template of templates) {
      for (const [key, descriptor] of DSKDataModel.#collectDescriptors(template, DSKDataModel, this._immiscible)) {
        if (this._immiscible.has(key)) continue;
        Object.defineProperty(Base, key, descriptor);
      }

      for (const [key, descriptor] of DSKDataModel.#collectDescriptors(template.prototype, DSKDataModel.prototype, new Set(['constructor']))) {
        Object.defineProperty(Base.prototype, key, descriptor);
      }
    }

    return Base;
  }
}