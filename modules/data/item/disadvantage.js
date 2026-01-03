import { ItemDataModel } from '../baseitem.js';
import DescriptionTemplate from './templates/description.js';
import APValueTemplate from './templates/apvalue.js';
import MaxTemplate from './templates/max.js';
import RequirementsTemplate from './templates/requirements.js';

const { SchemaField, StringField } = foundry.data.fields;

/**
 * DataModel for Disadvantage items
 */
export default class DisadvantageData extends ItemDataModel.mixin(
  DescriptionTemplate, 
  APValueTemplate, 
  MaxTemplate, 
  RequirementsTemplate
) {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      rule: new StringField({ initial: '' }),
      effect: new SchemaField({
        value: new StringField({ initial: '' }),
      }),
    });
  }

  static chatData(data, name) {
    return [
      { key: 'dsk.effect', val: data.effect?.value },
      { key: 'dsk.ap', val: data.ap },
    ];
  }
}
