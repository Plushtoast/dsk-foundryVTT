import { ActorDataModel } from '../baseactor.js';
import CharacteristicsTemplate from './templates/characteristics.js';
import StatusTemplate from './templates/status.js';

const { SchemaField, StringField, NumberField, HTMLField } = foundry.data.fields;

/**
 * DataModel for Creature actors
 */
export default class CreatureData extends ActorDataModel.mixin(
  CharacteristicsTemplate,
  StatusTemplate
) {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      notes: new SchemaField({
        description: new HTMLField({ initial: '' }),
        fight: new HTMLField({ initial: '' }),
        specialRules: new HTMLField({ initial: '' }),
        owner: new HTMLField({ initial: '' }),
      }),
      actionCount: new NumberField({ initial: 1 }),
      count: new StringField({ initial: '1' }),
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

  static _migrateData(source) {
    super._migrateData(source);

    // Migrate actionCount from string to number if needed
    const actionCount = source.actionCount;
    if (typeof actionCount === 'string') {
      source.actionCount = Number(actionCount) || 1;
    }
  }
}
