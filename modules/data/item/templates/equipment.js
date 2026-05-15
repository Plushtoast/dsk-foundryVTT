import { DSKDataModel } from '../../abstract.js';

const { SchemaField, StringField, NumberField, BooleanField } = foundry.data.fields;

/**
 * Template for physical equipment (gear)
 */
export default class EquipmentTemplate extends DSKDataModel {
  static defineSchema() {
    return {
      price: new NumberField({ initial: 0, label: 'dsk.price' }),
      weight: new NumberField({ initial: 0, label: 'dsk.weight' }),
      quantity: new NumberField({ initial: 1, integer: true, min: 0, label: 'dsk.quantity' }),
      effect: new SchemaField({
        value: new StringField({ initial: '', label: 'dsk.effect' }),
        attributes: new StringField({ initial: '', label: 'dsk.attributes' }),
      }),
      parent_id: new StringField({ initial: '' }),
      tradeLocked: new BooleanField({ initial: false, label: 'dsk.tradeLocked' }),
    };
  }

  /**
   * Calculate total weight
   */
  get totalWeight() {
    return (this.weight || 0) * (this.quantity || 1);
  }

  /**
   * Migrate old shield size values to new ones
   * @param {Object} source - The source data
   */
  static _migrateData(source, options, _state) {
    super._migrateData(source, options, _state);

    if (source.price == null || isNaN(source.price)) {
      source.price = 0;
    }
  }
}
