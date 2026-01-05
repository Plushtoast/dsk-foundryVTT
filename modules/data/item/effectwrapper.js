import { ItemDataModel } from '../baseitem.js';
import DescriptionTemplate from './templates/description.js';

/**
 * DataModel for Effectwrapper items
 */
export default class EffectwrapperData extends ItemDataModel.mixin(DescriptionTemplate) {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {});
  }
}
