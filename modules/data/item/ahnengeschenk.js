import { ItemDataModel } from '../baseitem.js';
import DescriptionTemplate from './templates/description.js';

const { StringField } = foundry.data.fields;

/**
 * DataModel for Ahnengeschenk items
 */
export default class AhnengeschenkData extends ItemDataModel.mixin(DescriptionTemplate) {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      range: new StringField({ initial: '', label: 'dsk.range' }),
      duration: new StringField({ initial: '', label: 'dsk.duration' }),
      distribution: new StringField({ initial: '', label: 'dsk.distribution' }),
    });
  }

  static chatData(data, name) {
    return [
      { key: 'dsk.range', val: data.range },
      { key: 'dsk.duration', val: data.duration },
      { key: 'dsk.distribution', val: data.distribution },
    ];
  }
}
