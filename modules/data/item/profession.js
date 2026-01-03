import { ItemDataModel } from '../baseitem.js';
import DescriptionTemplate from './templates/description.js';

const { SchemaField, StringField, BooleanField } = foundry.data.fields;

/**
 * DataModel for Profession items
 */
export default class ProfessionData extends ItemDataModel.mixin(DescriptionTemplate) {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      description: new SchemaField({
        value: new StringField({ initial: '' }),
        gear: new StringField({ initial: '' }),
      }),
      skills: new SchemaField({
        body: new StringField({ initial: '' }),
        social: new StringField({ initial: '' }),
        mental: new StringField({ initial: '' }),
        trade: new StringField({ initial: '' }),
        combat: new StringField({ initial: '' }),
      }),
      requirements: new SchemaField({
        advantage: new StringField({ initial: '-' }),
        specialability: new StringField({ initial: '-' }),
      }),
      isAncestor: new BooleanField({ initial: false }),
      ahnengabe: new StringField({ initial: '' }),
      ahnengeschenk: new StringField({ initial: '' }),
    });
  }
}
