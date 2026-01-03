import { ItemDataModel } from '../baseitem.js';
import DescriptionTemplate from './templates/description.js';

const { StringField, NumberField } = foundry.data.fields;

/**
 * DataModel for Trait items
 */
export default class TraitData extends ItemDataModel.mixin(DescriptionTemplate) {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      traitType: new StringField({ initial: 'meleeAttack' }),
      at: new StringField({ initial: '' }),
      pa: new StringField({ initial: '' }),
      rw: new StringField({ initial: 'medium' }),
      tp: new StringField({ initial: '1d6' }),
      reloadTimeprogress: new NumberField({ initial: 0 }),
      lz: new NumberField({ initial: 1 }),
    });
  }

  static chatData(data, name) {
    return [
      { key: 'dsk.traitType', val: data.traitType, localizeVal: true },
      { key: 'dsk.at', val: data.at },
      { key: 'dsk.pa', val: data.pa },
      { key: 'dsk.tp', val: data.tp },
      { key: 'dsk.rw', val: data.rw, localizeVal: true },
    ];
  }
}
