import { DSKDataModel } from '../../abstract.js';

const { SchemaField, BooleanField } = foundry.data.fields;

/**
 * Template for wearable items
 */
export default class WornTemplate extends DSKDataModel {
  static defineSchema() {
    return {
      worn: new SchemaField({
        value: new BooleanField({ initial: false, label: 'dsk.worn' }),
        wearable: new BooleanField({ initial: true, label: 'dsk.wearable' }),
        wrongGrip: new BooleanField({ initial: false, label: 'dsk.wrongGrip' }),
      }),
    };
  }

  /**
   * Check if item is currently worn
   */
  get isWorn() {
    return this.worn?.value ?? false;
  }

  /**
   * Check if item can be worn
   */
  get canBeWorn() {
    return this.worn?.wearable ?? true;
  }
}
