import { DSKDataModel } from '../../abstract.js';

const { SchemaField, StringField, NumberField, HTMLField } = foundry.data.fields;

/**
 * Template for hero stats (profession, culture, experience, etc.)
 */
export default class DetailsTemplate extends DSKDataModel {
  static defineSchema() {
    return {
      details: new SchemaField({
        profession: new StringField({ initial: '' }),
        culture: new StringField({ initial: '' }),
        gender: new StringField({ initial: '' }),
        pack: new StringField({ initial: '' }),
        age: new StringField({ initial: '' }),
        experience: new SchemaField({
          total: new NumberField({ initial: 0 }),
          spent: new NumberField({ initial: 0 }),
        }),
      }),
      guidevalue: new StringField({ initial: '-' }),
      notes: new SchemaField({
        owner: new HTMLField({ initial: '' }),
        gm: new HTMLField({ initial: '' }),
        description: new HTMLField({ initial: '' }),
        biography: new HTMLField({ initial: '' }),
      }),
    };
  }
}
