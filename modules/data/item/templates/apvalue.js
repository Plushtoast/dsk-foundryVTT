import { DSKDataModel } from '../../abstract.js';

const { StringField, NumberField } = foundry.data.fields;

/**
 * Template for items with AP cost
 */
export default class APValueTemplate extends DSKDataModel {
  static defineSchema() {
    return {
      ap: new StringField({ initial: '0', label: 'dsk.APValue' }),
    };
  }

  /**
   * Get numeric AP value
   */
  get apCost() {
    const ap = this.ap;
    if (typeof ap === 'number') return ap;
    return parseInt(ap) || 0;
  }
}
