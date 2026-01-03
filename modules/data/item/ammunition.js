import { ItemDataModel } from '../baseitem.js';
import DescriptionTemplate from './templates/description.js';
import EquipmentTemplate from './templates/equipment.js';
import DSK from '../../system/config.js';

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
      ammunitionType: new StringField({ 
        initial: '-',
        choices: DSK.ammunitiongroups,
        label: 'dsk.ammunitiontype'
      }),
      length: new StringField({ initial: '', label: 'dsk.length' }),
      mag: new SchemaField({
        max: new NumberField({ initial: 0, label: 'dsk.magMax' }),
        value: new NumberField({ initial: 0, label: 'dsk.magValue' }),
      }),
    });
  }

  static chatData(data, name) {
    return [
      { key: 'dsk.ammunitionType', val: data.ammunitionType },
    ];
  }
}
