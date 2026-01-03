import { ItemDataModel } from '../baseitem.js';
import DescriptionTemplate from './templates/description.js';

const { StringField, NumberField } = foundry.data.fields;

/**
 * DataModel for Poison items
 */
export default class PoisonData extends ItemDataModel.mixin(DescriptionTemplate) {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      level: new NumberField({ initial: 1 }),
      category: new StringField({ initial: '' }),
      resist: new StringField({ initial: '-' }),
      effect: new StringField({ initial: '' }),
      start: new StringField({ initial: '' }),
      duration: new StringField({ initial: '' }),
      search: new StringField({ initial: '-' }),
      process: new StringField({ initial: '-' }),
      price: new NumberField({ initial: 0 }),
      quantity: new NumberField({ initial: 1 }),
    });
  }

  static chatData(data, name) {
    return [
      { key: 'dsk.level', val: data.level },
      { key: 'dsk.category', val: data.category },
      { key: 'dsk.resist', val: data.resist },
      { key: 'dsk.effect', val: data.effect },
    ];
  }
}
