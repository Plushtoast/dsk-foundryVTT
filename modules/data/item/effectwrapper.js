import { ItemDataModel } from '../baseitem.js';

const { StringField } = foundry.data.fields;

/**
 * DataModel for Effectwrapper items
 */
export default class EffectwrapperData extends ItemDataModel {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      description: new StringField({ initial: '' }),
    });
  }
}
