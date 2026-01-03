import { ItemDataModel } from '../baseitem.js';

const { StringField, NumberField } = foundry.data.fields;

/**
 * DataModel for Information items
 */
export default class InformationData extends ItemDataModel {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      qs1: new StringField({ initial: '' }),
      qs2: new StringField({ initial: '' }),
      qs3: new StringField({ initial: '' }),
      qs4: new StringField({ initial: '' }),
      qs5: new StringField({ initial: '' }),
      qs6: new StringField({ initial: '' }),
      skill: new StringField({ initial: '' }),
      modifier: new NumberField({ initial: 0 }),
    });
  }
}
