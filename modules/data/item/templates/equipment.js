import { DSKDataModel } from '../../abstract.js';

const { SchemaField, StringField, NumberField, BooleanField } = foundry.data.fields;

/**
 * Template for physical equipment (gear)
 */
export default class EquipmentTemplate extends DSKDataModel {
  static defineSchema() {
    return {
      price: new NumberField({ initial: 0 }),
      weight: new NumberField({ initial: 0 }),
      quantity: new NumberField({ initial: 1, integer: true, min: 0 }),
      effect: new SchemaField({
        value: new StringField({ initial: '' }),
        attributes: new StringField({ initial: '' }),
      }),
      parent_id: new StringField({ initial: '' }),
      tradeLocked: new BooleanField({ initial: false }),
    };
  }

  /**
   * Calculate total weight
   */
  get totalWeight() {
    return (this.weight || 0) * (this.quantity || 1);
  }
}
