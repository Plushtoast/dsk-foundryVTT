import { ItemDataModel } from '../baseitem.js';
import DescriptionTemplate from './templates/description.js';

const { StringField, NumberField } = foundry.data.fields;

/**
 * DataModel for Ahnengabe items
 */
export default class AhnengabeData extends ItemDataModel.mixin(DescriptionTemplate) {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      characteristic1: new StringField({ initial: 'ff' }),
      characteristic2: new StringField({ initial: 'ff' }),
      effect: new StringField({ initial: '' }),
      AeP: new StringField({ initial: '' }),
      range: new StringField({ initial: '' }),
      duration: new StringField({ initial: '' }),
      targetCategory: new StringField({ initial: '' }),
      distribution: new StringField({ initial: '' }),
      effectFormula: new StringField({ initial: '' }),
      StF: new StringField({ initial: 'A' }),
      resist: new StringField({ initial: '-' }),
      level: new NumberField({ initial: 0, integer: true, min: 0 }),
    });
  }

  static chatData(data, name) {
    return [
      { key: 'dsk.characteristic1', val: `dsk.CH.${data.characteristic1}`, localizeVal: true },
      { key: 'dsk.characteristic2', val: `dsk.CH.${data.characteristic2}`, localizeVal: true },
      { key: 'dsk.effect', val: data.effect },
      { key: 'dsk.AeP', val: data.AeP },
      { key: 'dsk.range', val: data.range },
      { key: 'dsk.duration', val: data.duration },
    ];
  }
}
