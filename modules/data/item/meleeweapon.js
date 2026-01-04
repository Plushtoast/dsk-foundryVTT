import { ItemDataModel } from '../baseitem.js';
import DescriptionTemplate from './templates/description.js';
import EquipmentTemplate from './templates/equipment.js';
import ObfuscableTemplate from './templates/obfuscable.js';
import WornTemplate from './templates/worn.js';
import DSK from '../../system/config.js';

const { StringField, NumberField } = foundry.data.fields;

/**
 * DataModel for MeleeWeapon items
 */
export default class MeleeweaponData extends ItemDataModel.mixin(
  DescriptionTemplate,
  EquipmentTemplate,
  ObfuscableTemplate,
  WornTemplate
) {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      tp: new StringField({ initial: '1d6', label: 'dsk.damage' }),
      aw: new NumberField({ initial: 0, label: 'dsk.ABBR.AW' }),
      awoffhand: new NumberField({ initial: 0, label: 'dsk.ITEMSHEET.offHandMod' }),
      vwoffhand: new NumberField({ initial: 0, label: 'dsk.ITEMSHEET.offHandMod' }),
      vw: new NumberField({ initial: 0, label: 'dsk.ABBR.VW' }),
      rw: new StringField({ 
        initial: 'medium',
        choices: DSK.meleeRanges,
        label: 'dsk.range'
      }),
      shieldsize: new StringField({ 
        initial: 'medium',
        choices: DSK.shieldSizes,
        label: 'dsk.shieldSize'
      }),
      length: new StringField({ initial: '', label: 'dsk.length' }),
      combatskill: new StringField({ initial: 'Einhandwaffen', label: 'TYPES.Item.combatskill' }),
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
