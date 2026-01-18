import { ItemDataModel } from '../baseitem.js';
import DescriptionTemplate from './templates/description.js';
import APValueTemplate from './templates/apvalue.js';
import MaxTemplate from './templates/max.js';
import RequirementsTemplate from './templates/requirements.js';

const { SchemaField, StringField, HTMLField } = foundry.data.fields;

/**
 * DataModel for Advantage items
 */
export default class AdvantageData extends ItemDataModel.mixin(
  DescriptionTemplate, 
  APValueTemplate, 
  MaxTemplate, 
  RequirementsTemplate
) {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      rule: new HTMLField({ initial: '', label: 'dsk.rule' }),
      effect: new SchemaField({
        value: new StringField({ initial: '', label: 'dsk.effect' }),
      }),
    });
  }

  static chatData(data, name) {
    return [
      { key: 'dsk.effect', val: data.effect?.value },
      { key: 'dsk.ap', val: data.ap },
    ];
  }

  /**
   * Prepare the item for display in an embedded sheet (actor sheet)
   * @returns {Object} The prepared item data
   */
  prepareEmbeddedItemSheet() {
    const item = super.prepareEmbeddedItemSheet();
    this._setOnUseEffect(item);
    return item;
  }
}
