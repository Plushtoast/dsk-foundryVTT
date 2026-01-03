import { ItemDataModel } from '../baseitem.js';
import DescriptionTemplate from './templates/description.js';
import EquipmentTemplate from './templates/equipment.js';
import WornTemplate from './templates/worn.js';

const { StringField, NumberField } = foundry.data.fields;

/**
 * DataModel for MeleeWeapon items
 */
export default class MeleeweaponData extends ItemDataModel.mixin(
  DescriptionTemplate,
  EquipmentTemplate,
  WornTemplate
) {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      tp: new StringField({ initial: '1d6' }),
      aw: new NumberField({ initial: 0 }),
      awoffhand: new NumberField({ initial: 0 }),
      vwoffhand: new NumberField({ initial: 0 }),
      vw: new NumberField({ initial: 0 }),
      rw: new StringField({ initial: 'medium' }),
      shieldsize: new StringField({ initial: 'medium' }),
      length: new StringField({ initial: '' }),
      combatskill: new StringField({ initial: 'Einhandwaffen' }),
    });
  }

  static chatData(data, name) {
    return [
      { key: 'dsk.combatskill', val: data.combatskill },
      { key: 'dsk.tp', val: data.tp },
      { key: 'dsk.aw', val: data.aw },
      { key: 'dsk.vw', val: data.vw },
      { key: 'dsk.rw', val: data.rw, localizeVal: true },
    ];
  }

  /**
   * Check if weapon is a shield
   */
  get isShield() {
    return this.combatskill === game.i18n?.localize('dsk.LocalizedIDs.Shields');
  }
}
