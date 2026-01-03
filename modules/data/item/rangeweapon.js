import { ItemDataModel } from '../baseitem.js';
import DescriptionTemplate from './templates/description.js';
import EquipmentTemplate from './templates/equipment.js';
import WornTemplate from './templates/worn.js';
import DSK from '../../system/config.js';

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
      tp: new StringField({ initial: '1d6', label: 'dsk.damage' }),
      lz: new NumberField({ initial: 1, label: 'dsk.reloadTime' }),
      rw: new StringField({ initial: '0/0/0', label: 'dsk.range' }),
      ammunitionType: new StringField({ 
        initial: '-',
        choices: DSK.ammunitiongroups,
        label: 'dsk.ammunitiontype'
      }),
      length: new NumberField({ initial: 0, label: 'dsk.length' }),
      combatskill: new StringField({ initial: 'Schusswaffen', label: 'TYPES.Item.combatskill' }),
      currentAmmo: new StringField({ initial: '', label: 'dsk.currentAmmo' }),
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
