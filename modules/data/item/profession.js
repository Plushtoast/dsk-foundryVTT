import { ItemDataModel } from '../baseitem.js';
import DescriptionTemplate from './templates/description.js';

const { SchemaField, StringField, BooleanField, HTMLField } = foundry.data.fields;

/**
 * DataModel for Profession items
 */
export default class ProfessionData extends ItemDataModel.mixin(DescriptionTemplate) {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      description: new SchemaField({
        value: new HTMLField({ initial: '', label: 'dsk.description' }),
        gear: new HTMLField({ initial: '', label: 'dsk.gear' }),
      }),
      skills: new SchemaField({
        body: new StringField({ initial: '', label: 'dsk.SKILL.body' }),
        social: new StringField({ initial: '', label: 'dsk.SKILL.social' }),
        mental: new StringField({ initial: '', label: 'dsk.SKILL.knowledge' }),
        trade: new StringField({ initial: '', label: 'dsk.SKILL.trade' }),
        combat: new StringField({ initial: '', label: 'dsk.SKILL.combat' }),
      }),
      requirements: new SchemaField({
        advantage: new StringField({ initial: '-', label: 'TYPES.Item.advantage' }),
        specialability: new StringField({ initial: '-', label: 'TYPES.Item.specialability' }),
      }),
      isAncestor: new BooleanField({ initial: false, label: 'dsk.SPECIALABILITYCATEGORIES.ahnen' }),
      ahnengabe: new StringField({ initial: '', label: 'TYPES.Item.ahnengabe' }),
      ahnengeschenk: new StringField({ initial: '', label: 'TYPES.Item.ahnengeschenk' }),
    });
  }
}
