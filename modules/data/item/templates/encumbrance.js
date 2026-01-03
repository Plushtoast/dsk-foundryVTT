import { DSKDataModel } from '../../abstract.js';

const { StringField } = foundry.data.fields;

/**
 * Template for skills with encumbrance
 */
export default class EncumbranceTemplate extends DSKDataModel {
  static defineSchema() {
    return {
      encumbers: new StringField({ 
        initial: 'no',
        choices: {
          'no': 'No',
          'yes': 'Yes', 
          'maybe': 'Maybe'
        }
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
