import { ActorDataModel } from '../baseactor.js';
import CharacteristicsTemplate from './templates/characteristics.js';
import MerchantTemplate from './templates/merchant.js';
import StatusTemplate from './templates/status.js';

const { SchemaField, StringField, NumberField, HTMLField } = foundry.data.fields;

/**
 * DataModel for Creature actors
 */
export default class CreatureData extends ActorDataModel.mixin(
  CharacteristicsTemplate,
  MerchantTemplate,
  StatusTemplate
) {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      notes: new SchemaField({
        description: new HTMLField({ initial: '', label: 'dsk.description' }),
        fight: new HTMLField({ initial: '', label: 'dsk.fight' }),
        specialRules: new HTMLField({ initial: '', label: 'dsk.specialRules' }),
        owner: new HTMLField({ initial: '', label: 'dsk.ownerNotes' }),
      }),
      actionCount: new NumberField({ initial: 1, label: 'dsk.actionCount' }),
      count: new StringField({ initial: '1', label: 'dsk.count' }),
    });
  }

  /**
   * Creatures cannot advance
   */
  get canAdvance() {
    return false;
  }

  /**
   * Calculate base initiative (uses current directly)
   */
  baseInitiative(data) {
    const ini = this.stats?.ini;
    if (ini) {
      ini.value = (ini.current || 0) + (ini.modifier || 0);
    }
  }

  static _migrateData(source, options, _state) {
    super._migrateData(source, options, _state);

    // Migrate actionCount from string to number if needed
    const actionCount = source.actionCount;
    if (typeof actionCount === 'string') {
      source.actionCount = Number(actionCount) || 1;
    }
  }
}
