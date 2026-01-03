import { DSKDataModel } from '../../abstract.js';

const { StringField } = foundry.data.fields;

/**
 * Template for items with requirements
 */
export default class RequirementsTemplate extends DSKDataModel {
  static defineSchema() {
    return {
      requirements: new StringField({ initial: '', label: 'dsk.requirements' }),
    };
  }

  /**
   * Parse requirements string into array
   */
  get parsedRequirements() {
    if (!this.requirements) return [];
    return this.requirements.split(',').map(r => r.trim()).filter(r => r);
  }
}
