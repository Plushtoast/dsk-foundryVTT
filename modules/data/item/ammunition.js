import { ItemDataModel } from '../baseitem.js';
import DescriptionTemplate from './templates/description.js';
import EquipmentTemplate from './templates/equipment.js';

const { SchemaField, StringField, NumberField } = foundry.data.fields;

/**
 * DataModel for Ammunition items
 */
export default class AmmunitionData extends ItemDataModel.mixin(
  DescriptionTemplate,
  EquipmentTemplate
) {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      ammunitionType: new StringField({ initial: '-' }),
      length: new StringField({ initial: '' }),
      mag: new SchemaField({
        max: new NumberField({ initial: 0 }),
        value: new NumberField({ initial: 0 }),
      }),
    });
  }

  static chatData(data, name) {
    return [
      { key: 'dsk.ammunitionType', val: data.ammunitionType },
    ];
  }
}
