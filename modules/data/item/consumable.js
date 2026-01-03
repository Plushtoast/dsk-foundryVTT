import { ItemDataModel } from '../baseitem.js';
import DescriptionTemplate from './templates/description.js';
import EquipmentTemplate from './templates/equipment.js';
import DSK from '../../system/config.js';

const { StringField, NumberField } = foundry.data.fields;

/**
 * DataModel for Consumable items
 */
export default class ConsumableData extends ItemDataModel.mixin(
  DescriptionTemplate,
  EquipmentTemplate
) {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      category: new NumberField({ 
        initial: 0, 
        choices: DSK.consumableCategories,
        label: 'dsk.equipmentType' 
      }),
      ingredients: new StringField({ initial: '', label: 'dsk.consumable.ingredients' }),
      effect0: new StringField({ initial: '', label: 'dsk.consumable.effect' }),
      effect1: new StringField({ initial: '', label: 'dsk.consumable.effect' }),
      effect2: new StringField({ initial: '', label: 'dsk.consumable.effect' }),
      qs: new NumberField({ 
        initial: 0, 
        choices: DSK.qsOptions,
        label: 'dsk.consumable.qs.label' 
      }),
      difficulty: new NumberField({ initial: 0, label: 'dsk.consumable.difficulty' }),
    });
  }

  static chatData(data, name) {
    return [
      { key: 'dsk.category', val: data.category },
      { key: 'dsk.qs', val: data.qs },
    ];
  }
}
