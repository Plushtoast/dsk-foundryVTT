import { ItemDataModel } from '../baseitem.js';
import DescriptionTemplate from './templates/description.js';
import APValueTemplate from './templates/apvalue.js';
import MaxTemplate from './templates/max.js';
import RequirementsTemplate from './templates/requirements.js';
import DSK from '../../system/config.js';

const { SchemaField, StringField, NumberField } = foundry.data.fields;

/**
 * DataModel for SpecialAbility items
 */
export default class SpecialabilityData extends ItemDataModel.mixin(
  DescriptionTemplate, 
  APValueTemplate, 
  MaxTemplate, 
  RequirementsTemplate
) {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      rule: new StringField({ initial: '', label: 'dsk.rule' }),
      category: new StringField({ 
        initial: 'general',
        choices: DSK.specialAbilityCategories,
        label: 'dsk.category'
      }),
      subcategory: new NumberField({ initial: 0, label: 'dsk.subcategory' }),
      combatskills: new StringField({ initial: '', label: 'dsk.combatskills' }),
      effect: new SchemaField({
        value: new StringField({ initial: '', label: 'dsk.effect' }),
      }),
    });
  }

  static chatData(data, name) {
    return [
      { key: 'dsk.category', val: data.category, localizeVal: true },
      { key: 'dsk.effect', val: data.effect?.value },
      { key: 'dsk.ap', val: data.ap },
    ];
  }
}
