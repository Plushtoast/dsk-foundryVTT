import { DSKDataModel } from '../../abstract.js';
import DSK from '../../../system/config.js';
import DSKUtility from '../../../system/dsk_utility.js';
import ActorDSK from '../../../actor/actor_dsk.js';

const { StringField, NumberField } = foundry.data.fields;

/**
 * Template for skill-based items
 */
export default class SkillTemplate extends DSKDataModel {
  static defineSchema() {
    return {
      characteristic1: new StringField({
        initial: 'ff',
        choices: DSK.characteristics,
        label: 'dsk.Characteristic'
      }),
      characteristic2: new StringField({
        initial: 'ff',
        choices: DSK.characteristics,
        label: 'dsk.Characteristic'
      }),
      StF: new StringField({
        initial: 'A',
        choices: DSK.StFs,
        label: 'dsk.StF'
      }),
      level: new NumberField({
        initial: 0,
        integer: true,
        min: 0,
        label: 'dsk.level'
      }),
    };
  }

  /**
   * Get skill factor multiplier for AP costs
   */
  get skillFactor() {
    const StFs = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5 };
    return StFs[this.StF] || 1;
  }

  _prepareItemAdvancementCost(item) {
    item.cost = _loc("dsk.advancementCost", {
      cost: DSKUtility._calculateAdvCost(item.system.level, item.system.StF),
    });
    item.refund = _loc("dsk.refundCost", {
      cost: DSKUtility._calculateAdvCost(item.system.level, item.system.StF, 0),
    });
    item.canAdvance = this.parent.parent.system.canAdvance;
    return item;
  }

  static _calculatePW(item, actorData) {
    item.PW = Math.round((
      this._attrFromCharacteristic(item.system.characteristic1, actorData)
      + this._attrFromCharacteristic(item.system.characteristic2, actorData)) / 2) 
      + 5 + (item.system.level || 0)
    return item
  }

  static _attrFromCharacteristic(char, actorData) {
    const characteristic = actorData.characteristics[char];
    if (!characteristic) return 8;
    return (characteristic.initial || 8) + (characteristic.modifier || 0) + (characteristic.advances || 0) + (characteristic.gearmodifier || 0);
  }
}
