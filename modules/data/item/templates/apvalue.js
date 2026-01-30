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
}
