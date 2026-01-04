import { ItemDataModel } from '../baseitem.js';
import DescriptionTemplate from './templates/description.js';
import DSK from '../../system/config.js';

const { StringField, NumberField } = foundry.data.fields;

/**
 * DataModel for Trait items
 */
export default class TraitData extends ItemDataModel.mixin(DescriptionTemplate) {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      traitType: new StringField({ 
        initial: 'meleeAttack',
        choices: DSK.traitCategories,
        label: 'dsk.category'
      }),
      at: new StringField({ initial: '', label: 'dsk.ABBR.AW' }),
      pa: new StringField({ initial: '', label: 'dsk.ABBR.VW' }),
      rw: new StringField({ 
        initial: 'medium',
        choices: DSK.meleeRanges,
        label: 'dsk.range'
      }),
      tp: new StringField({ initial: '1d6', label: 'dsk.damage' }),
      reloadTimeprogress: new NumberField({ initial: 0 }),
      lz: new NumberField({ initial: 1, label: 'dsk.reloadTime' }),
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

  /**
   * Prepare the item for display in an embedded sheet (actor sheet)
   * @returns {Object} The prepared item data
   */
  prepareEmbeddedItemSheet() {
    const item = super.prepareEmbeddedItemSheet();
    this.constructor._prepareItemStructure(item);
    this._setOnUseEffect(item);
    
    item.attack = Number(item.system.at);
    if (item.system.pa != 0) item.parry = Number(item.system.pa);
    
    return item;
  }
}
