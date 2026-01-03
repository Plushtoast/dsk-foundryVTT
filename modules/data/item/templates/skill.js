import { DSKDataModel } from '../../abstract.js';
import DSK from '../../../system/config.js';

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
}
