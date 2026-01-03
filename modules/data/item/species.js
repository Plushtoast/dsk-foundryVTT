import { ItemDataModel } from '../baseitem.js';
import DescriptionTemplate from './templates/description.js';

const { StringField, NumberField } = foundry.data.fields;

/**
 * DataModel for Species items
 */
export default class SpeciesData extends ItemDataModel.mixin(DescriptionTemplate) {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      LeP: new NumberField({ initial: 0 }),
      sk: new NumberField({ initial: 0 }),
      zk: new NumberField({ initial: 0 }),
      gs: new NumberField({ initial: 0 }),
      advantages: new StringField({ initial: '' }),
    });
  }

  static chatData(data, name) {
    return [
      { key: 'dsk.LeP', val: data.LeP },
      { key: 'dsk.sk', val: data.sk },
      { key: 'dsk.zk', val: data.zk },
      { key: 'dsk.gs', val: data.gs },
    ];
  }
}
