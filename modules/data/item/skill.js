import { ItemDataModel } from '../baseitem.js';
import DescriptionTemplate from './templates/description.js';
import SkillTemplate from './templates/skill.js';
import EncumbranceTemplate from './templates/encumbrance.js';
import DSK from '../../system/config.js';

const { StringField } = foundry.data.fields;

/**
 * DataModel for Skill items
 */
export default class SkillData extends ItemDataModel.mixin(
  DescriptionTemplate,
  SkillTemplate,
  EncumbranceTemplate
) {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      group: new StringField({ 
        initial: 'body',
        choices: DSK.skillGroups,
        label: 'dsk.Group'
      }),
    });
  }

  static chatData(data, name) {
    return [
      { key: 'dsk.characteristic1', val: `dsk.CH.${data.characteristic1}`, localizeVal: true },
      { key: 'dsk.characteristic2', val: `dsk.CH.${data.characteristic2}`, localizeVal: true },
      { key: 'dsk.encumbers', val: data.encumbers, localizeVal: true },
      { key: 'dsk.StF', val: data.StF },
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
