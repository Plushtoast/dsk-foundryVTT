import { ItemDataModel } from '../baseitem.js';
import DescriptionTemplate from './templates/description.js';
import DSK from '../../system/config.js';
import ActorDSK from '../../actor/actor_dsk.js';

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
        label: 'dsk.range'
      }),
      tp: new StringField({ initial: '1d6', label: 'dsk.damage' }),
      reloadTimeprogress: new NumberField({ initial: 0 }),
      lz: new NumberField({ initial: 1, label: 'dsk.reloadTime' }),
    });
  }

  async getSheetData(data) {
    data.ranges = DSK.meleeRanges;
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

    switch (item.system.traitType) {
      case "rangeAttack":
        item = this.constructor._prepareRangeTrait(item, actorData);
        break;
      case "meleeAttack":
        item = this.constructor._prepareMeleetrait(item, actorData);
        break;
      case "armor":
        totalArmor += Number(item.system.at);
        break;
    }

    return item;
  }

  static _prepareRangeTrait(item, actor) {
    item.attack = Number(item.system.at) + Number(actor.system.rangeStats.attack);
    item.LZ = Number(item.system.lz);
    if (item.LZ > 0) this.buildReloadProgress(item);

    return ActorDSK._parseDmg(item);
  }

  static _prepareMeleetrait(item, actor) {
    item.attack = Number(item.system.at);
    item.parry = Math.max(0, (Number(item.system.pa) || Math.round(item.attack / 4)) + Number(actor.system.meleeStats.parry));

    return ActorDSK._parseDmg(item);
  }
}
