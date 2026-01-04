import { ItemDataModel } from '../baseitem.js';
import DescriptionTemplate from './templates/description.js';
import EquipmentTemplate from './templates/equipment.js';
import ObfuscableTemplate from './templates/obfuscable.js';
import DSK from '../../system/config.js';

const { SchemaField, StringField, NumberField } = foundry.data.fields;

/**
 * DataModel for Ammunition items
 */
export default class AmmunitionData extends ItemDataModel.mixin(
  DescriptionTemplate,
  EquipmentTemplate,
  ObfuscableTemplate
) {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      ammunitionType: new StringField({ 
        initial: '-',
        choices: DSK.ammunitiongroups,
        label: 'dsk.ammunitiontype'
      }),
      length: new StringField({ initial: '', label: 'dsk.length' }),
      rangeMultiplier: new NumberField({ initial: 1, label: 'dsk.rangeMultiplier', step: 0.1, min: 0 }),
      atmod: new NumberField({ initial: 0, label: 'dsk.atmod' }),
      damageMod: new StringField({ initial: '', label: 'dsk.damageMod' }),
      armorMod: new StringField({ initial: '', label: 'dsk.armorMod' }),
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
