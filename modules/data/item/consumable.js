import { ItemDataModel } from '../baseitem.js';
import DescriptionTemplate from './templates/description.js';
import EquipmentTemplate from './templates/equipment.js';

const { StringField, NumberField } = foundry.data.fields;

/**
 * DataModel for Consumable items
 */
export default class ConsumableData extends ItemDataModel.mixin(
  DescriptionTemplate,
  EquipmentTemplate
) {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      category: new NumberField({ initial: 0 }),
      ingredients: new StringField({ initial: '' }),
      effect0: new StringField({ initial: '' }),
      effect1: new StringField({ initial: '' }),
      effect2: new StringField({ initial: '' }),
      qs: new NumberField({ initial: 0 }),
      difficulty: new NumberField({ initial: 0 }),
    });
  }

  static chatData(data, name) {
    return [
      { key: 'dsk.category', val: data.category },
      { key: 'dsk.qs', val: data.qs },
    ];
  }
}
