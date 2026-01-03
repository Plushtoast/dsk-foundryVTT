import { DSKDataModel } from '../../abstract.js';

const { NumberField } = foundry.data.fields;

/**
 * Template for items with level and max level
 */
export default class MaxTemplate extends DSKDataModel {
  static defineSchema() {
    return {
      level: new NumberField({ initial: 0, integer: true, min: 0, label: 'dsk.stepValue' }),
      max: new NumberField({ initial: 0, integer: true, min: 0, label: 'dsk.maxlevel' }),
    };
  }

  /**
   * Check if item can be advanced
   */
  get canAdvance() {
    return this.max === 0 || this.level < this.max;
  }
}
