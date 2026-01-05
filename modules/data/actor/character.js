import { ActorDataModel } from '../baseactor.js';
import CharacteristicsTemplate from './templates/characteristics.js';
import DetailsTemplate from './templates/details.js';
import MerchantTemplate from './templates/merchant.js';
import StatusTemplate from './templates/status.js';

/**
 * DataModel for Character actors
 */
export default class CharacterData extends ActorDataModel.mixin(
  CharacteristicsTemplate,
  MerchantTemplate,
  StatusTemplate,
  DetailsTemplate
) {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      // Character-specific fields not in templates
    });
  }

  /**
   * Calculate available AP
   */
  get availableAP() {
    const exp = this.details?.experience || {};
    return (exp.total || 0) - (exp.spent || 0);
  }
}
