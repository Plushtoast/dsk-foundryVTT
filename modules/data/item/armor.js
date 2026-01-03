import { ItemDataModel } from '../baseitem.js';
import DescriptionTemplate from './templates/description.js';
import EquipmentTemplate from './templates/equipment.js';
import WornTemplate from './templates/worn.js';

const { NumberField } = foundry.data.fields;

/**
 * DataModel for Armor items
 */
export default class ArmorData extends ItemDataModel.mixin(
  DescriptionTemplate,
  EquipmentTemplate,
  WornTemplate
) {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      rs: new NumberField({ initial: 0 }),
      encumbrance: new NumberField({ initial: 0 }),
    });
  }

  static chatData(data, name) {
    return [
      { key: 'dsk.rs', val: data.rs },
      { key: 'dsk.encumbrance', val: data.encumbrance },
    ];
  }
}
