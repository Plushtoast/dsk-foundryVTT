import { ItemDataModel } from '../baseitem.js';
import DescriptionTemplate from './templates/description.js';
import EquipmentTemplate from './templates/equipment.js';
import WornTemplate from './templates/worn.js';

const { StringField, NumberField } = foundry.data.fields;

/**
 * DataModel for RangeWeapon items
 */
export default class RangeweaponData extends ItemDataModel.mixin(
  DescriptionTemplate,
  EquipmentTemplate,
  WornTemplate
) {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      tp: new StringField({ initial: '1d6' }),
      lz: new NumberField({ initial: 1 }),
      rw: new StringField({ initial: '0/0/0' }),
      ammunitionType: new StringField({ initial: '-' }),
      length: new NumberField({ initial: 0 }),
      combatskill: new StringField({ initial: 'Schusswaffen' }),
      currentAmmo: new StringField({ initial: '' }),
      reloadTimeprogress: new NumberField({ initial: 0 }),
    });
  }

  static chatData(data, name) {
    return [
      { key: 'dsk.combatskill', val: data.combatskill },
      { key: 'dsk.tp', val: data.tp },
      { key: 'dsk.lz', val: data.lz },
      { key: 'dsk.rw', val: data.rw },
      { key: 'dsk.ammunitionType', val: data.ammunitionType },
    ];
  }

  /**
   * Check if weapon is loaded
   */
  get isLoaded() {
    return this.reloadTimeprogress >= this.lz;
  }
}
