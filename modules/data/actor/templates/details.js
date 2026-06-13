import { DSKDataModel } from '../../abstract.js';
import DSK from '../../../system/config.js';

const { SchemaField, StringField, NumberField, HTMLField } = foundry.data.fields;

/**
 * Template for hero stats (profession, culture, experience, etc.)
 */
export default class DetailsTemplate extends DSKDataModel {
  static defineSchema() {
    return {
      details: new SchemaField({
        species: new StringField({ initial: '', label: 'TYPES.Item.species' }),
        size: new StringField({
          initial: 'average',
          choices: DSK.sizeCategories,
          label: 'dsk.size',
        }),
        profession: new StringField({ initial: '', label: 'TYPES.Item.profession' }),
        culture: new StringField({ initial: '', label: 'TYPES.Item.culture' }),
        gender: new StringField({ initial: '', label: 'dsk.Gender' }),
        pack: new StringField({ initial: '', label: 'dsk.pack' }),
        age: new StringField({ initial: '', label: 'dsk.Age' }),
        experience: new SchemaField({
          total: new NumberField({ initial: 0, label: 'dsk.totalAP' }),
          spent: new NumberField({ initial: 0, label: 'dsk.spentAP' }),
        }),
      }),
      guidevalue: new StringField({ initial: '-', label: 'dsk.guidevalue' }),
      notes: new SchemaField({
        owner: new HTMLField({ initial: '', label: 'dsk.ownerNotes' }),
        gm: new HTMLField({ initial: '', label: 'dsk.gmnotes' }),
        description: new HTMLField({ initial: '', label: 'dsk.notes' }),
        biography: new HTMLField({ initial: '', label: 'dsk.biography' }),
      }),
    };
  }
}
