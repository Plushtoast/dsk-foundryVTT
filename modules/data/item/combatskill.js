import { ItemDataModel } from '../baseitem.js';
import DescriptionTemplate from './templates/description.js';
import SkillTemplate from './templates/skill.js';
import EncumbranceTemplate from './templates/encumbrance.js';

const { StringField } = foundry.data.fields;

/**
 * DataModel for CombatSkill items
 */
export default class CombatskillData extends ItemDataModel.mixin(
  DescriptionTemplate,
  SkillTemplate,
  EncumbranceTemplate
) {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      weapontype: new StringField({ initial: 'melee' }),
    });
  }

  /**
   * Check if this is a melee combat skill
   */
  get isMelee() {
    return this.weapontype === 'melee';
  }

  /**
   * Check if this is a ranged combat skill
   */
  get isRanged() {
    return this.weapontype === 'range';
  }

  static chatData(data, name) {
    return [
      { key: 'dsk.characteristic1', val: `dsk.CH.${data.characteristic1}`, localizeVal: true },
      { key: 'dsk.characteristic2', val: `dsk.CH.${data.characteristic2}`, localizeVal: true },
      { key: 'dsk.weapontype', val: data.weapontype, localizeVal: true },
      { key: 'dsk.StF', val: data.StF },
    ];
  }
}
