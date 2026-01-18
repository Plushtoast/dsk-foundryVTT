import { ItemDataModel } from '../baseitem.js';
import DescriptionTemplate from './templates/description.js';
import SkillTemplate from './templates/skill.js';
import DSK from '../../system/config.js';

const { StringField, NumberField } = foundry.data.fields;

/**
 * DataModel for Ahnengabe items
 */
export default class AhnengabeData extends ItemDataModel.mixin(DescriptionTemplate, SkillTemplate) {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      characteristic1: new StringField({ 
        initial: 'ff',
        choices: DSK.characteristics,
        label: 'dsk.Characteristic'
      }),
      characteristic2: new StringField({ 
        initial: 'ff',
        choices: DSK.characteristics,
        label: 'dsk.Characteristic'
      }),
      effect: new StringField({ initial: '', label: 'dsk.effect' }),
      AeP: new StringField({ initial: '', label: 'dsk.AeP' }),
      range: new StringField({ initial: '', label: 'dsk.range' }),
      duration: new StringField({ initial: '', label: 'dsk.duration' }),
      targetCategory: new StringField({ initial: '', label: 'dsk.targetCategory' }),
      distribution: new StringField({ initial: '', label: 'dsk.distribution' }),
      effectFormula: new StringField({ initial: '', label: 'dsk.effectFormula' }),
      StF: new StringField({ 
        initial: 'A',
        choices: DSK.StFs,
        label: 'dsk.StF'
      }),
      resist: new StringField({ 
        initial: '-',
        choices: DSK.magicResistanceModifiers,
        label: 'dsk.resistanceModifier'
      }),
      level: new NumberField({ initial: 0, integer: true, min: 0, label: 'dsk.level' }),
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

  /**
   * Prepare the item for display in an embedded sheet (actor sheet)
   * @returns {Object} The prepared item data
   */
  prepareEmbeddedItemSheet() {
    const item = super.prepareEmbeddedItemSheet();
    this._prepareItemAdvancementCost(item)
    this.constructor._calculatePW(item, this.actor.system)
    return item;
  }
}
