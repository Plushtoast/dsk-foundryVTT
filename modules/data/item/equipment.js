import { ItemDataModel } from '../baseitem.js';
import DescriptionTemplate from './templates/description.js';
import EquipmentTemplate from './templates/equipment.js';
import ObfuscableTemplate from './templates/obfuscable.js';
import WornTemplate from './templates/worn.js';
import DSK from '../../system/config.js';

const { StringField, NumberField } = foundry.data.fields;

/**
 * DataModel for Equipment items
 */
export default class EquipmentData extends ItemDataModel.mixin(
  DescriptionTemplate,
  EquipmentTemplate,
  ObfuscableTemplate,
  WornTemplate
) {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      category: new StringField({ 
        initial: 'misc',
        choices: DSK.equipmentTypes,
        label: 'dsk.equipmentType'
      }),
      capacity: new NumberField({ initial: 0, label: 'dsk.carrycapacity' }),
    });
  }

  /**
   * Check if this equipment is a container
   */
  get isContainer() {
    return (this.capacity || 0) > 0;
  }

  static chatData(data, name) {
    return [
      { key: 'dsk.category', val: `dsk.equipmentType.${data.category}`, localizeVal: true },
    ];
  }

  /**
   * Prepare the item for display in an embedded sheet (actor sheet)
   * @returns {Object} The prepared item data
   */
  prepareEmbeddedItemSheet() {
    const item = super.prepareEmbeddedItemSheet();
    item.toggle = this.worn.wearable;
    item.toggleValue = item.system.worn.value && item.toggle;    
    this.constructor._prepareItemStructure(item);
    item.system.preparedWeight = this.parent.system.preparedWeight;
    this._setOnUseEffect(item);
    return item;
  }
}
