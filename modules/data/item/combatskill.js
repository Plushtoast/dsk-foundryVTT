import { ItemDataModel } from '../baseitem.js';
import DescriptionTemplate from './templates/description.js';
import SkillTemplate from './templates/skill.js';
import EncumbranceTemplate from './templates/encumbrance.js';
import DSK from '../../system/config.js';
import ActorDSK from '../../actor/actor_dsk.js';
import DSKUtility from '../../system/dsk_utility.js';

const { StringField, NumberField } = foundry.data.fields;

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
      weapontype: new StringField({ 
        initial: 'melee',
        choices: DSK.weapontypes,
        label: 'dsk.weapontype'
      }),
      subcategory: new NumberField({ 
        initial: 0,
        choices: DSK.combatSkillSubCategories,
        label: 'dsk.subcategory'
      }),
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

  /**
   * Prepare the item for display in an embedded sheet (actor sheet)
   * @returns {Object} The prepared item data
   */
  prepareEmbeddedItemSheet() {
    const item = super.prepareEmbeddedItemSheet();
    this.constructor._calculateCombatSkillValues(item, this.actor.system);
    this._prepareItemAdvancementCost(item);
    return item;
  }

  static _calculateCombatSkillValues(i, actorData) {
    i = this._calculatePW(i, actorData)
    // Store calculated values on item, not in system (DataModel is read-only)
    i.system.attack = i.PW
    if (i.system.weapontype == "melee") {
      i.system.parry = Math.round(i.PW * 0.25);
    } else {
      i.system.parry = 0;
    }
    i.cost = _loc("dsk.advancementCost", {
      cost: DSKUtility._calculateAdvCost(i.system.level, i.system.StF),
    });
    return i;
  }
}
