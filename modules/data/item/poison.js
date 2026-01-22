import { ItemDataModel } from '../baseitem.js';
import DescriptionTemplate from './templates/description.js';
import ObfuscableTemplate from './templates/obfuscable.js';
import DSK from '../../system/config.js';

const { StringField, NumberField } = foundry.data.fields;

/**
 * DataModel for Poison items
 */
export default class PoisonData extends ItemDataModel.mixin(
  DescriptionTemplate,
  ObfuscableTemplate
) {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      level: new NumberField({ initial: 1, label: 'dsk.level' }),
      subtype: new NumberField({ initial: 0, label: 'dsk.subtype', choices: DSK.poisonSubtypes }),
      category: new StringField({ initial: '', label: 'dsk.category' }),
      resist: new StringField({ 
        initial: '-',
        choices: DSK.magicResistanceModifiers,
        label: 'dsk.resistanceModifier'
      }),
      effect: new StringField({ initial: '', label: 'dsk.effect' }),
      start: new StringField({ initial: '', label: 'dsk.start' }),
      duration: new StringField({ initial: '', label: 'dsk.duration' }),
      search: new StringField({ initial: '-', label: 'dsk.search' }),
      process: new StringField({ initial: '-', label: 'dsk.process' }),
      harvest: new StringField({ initial: '', label: 'dsk.harvest' }),
      location: new StringField({ initial: '', label: 'dsk.location' }),
      price: new NumberField({ initial: 0, label: 'dsk.price' }),
      quantity: new NumberField({ initial: 1, label: 'dsk.quantity' }),
      weight: new NumberField({ initial: 0, label: 'dsk.weight' }),
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
