import { DSKDataModel } from '../../abstract.js';
import DSK from '../../../system/config.js';

const { StringField } = foundry.data.fields;

/**
 * Template for skills with encumbrance
 */
export default class EncumbranceTemplate extends DSKDataModel {
  static defineSchema() {
    return {
      encumbers: new StringField({ 
        initial: 'no',
        choices: DSK.skillBurdens,
        label: 'dsk.CONDITION.encumbered'
      }),
    };
  }

  /**
   * Check if skill is encumbered
   */
  get isEncumbered() {
    return this.encumbers === 'yes';
  }
}
