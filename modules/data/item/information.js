import { ItemDataModel } from '../baseitem.js';

const { StringField, NumberField } = foundry.data.fields;

/**
 * DataModel for Information items
 */
export default class InformationData extends ItemDataModel {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      qs1: new StringField({ initial: '', label: 'dsk.CHARAbbrev.QS' }),
      qs2: new StringField({ initial: '', label: 'dsk.CHARAbbrev.QS' }),
      qs3: new StringField({ initial: '', label: 'dsk.CHARAbbrev.QS' }),
      qs4: new StringField({ initial: '', label: 'dsk.CHARAbbrev.QS' }),
      qs5: new StringField({ initial: '', label: 'dsk.CHARAbbrev.QS' }),
      qs6: new StringField({ initial: '', label: 'dsk.CHARAbbrev.QS' }),
      skill: new StringField({ initial: '', label: 'TYPES.Item.skill' }),
      modifier: new NumberField({ initial: 0, label: 'dsk.Modifier' }),
    });
  }
}
