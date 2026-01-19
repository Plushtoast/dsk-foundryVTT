import { ItemDataModel } from '../baseitem.js';
import DescriptionTemplate from './templates/description.js';

const { StringField } = foundry.data.fields;

/**
 * DataModel for Culture items
 */
export default class CultureData extends ItemDataModel.mixin(DescriptionTemplate) {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      skills: new StringField({ initial: '', label: 'dsk.skills' }),
      advantages: new StringField({ initial: '', label: 'dsk.specialAdvantage' }),
    });
  }
}
