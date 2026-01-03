import { ActorDataModel } from '../baseactor.js';
import CharacteristicsTemplate from './templates/characteristics.js';
import DetailsTemplate from './templates/details.js';
import StatusTemplate from './templates/status.js';

const { SchemaField, NumberField, BooleanField } = foundry.data.fields;

/**
 * DataModel for Character actors
 */
export default class CharacterData extends ActorDataModel.mixin(
  CharacteristicsTemplate,
  StatusTemplate,
  DetailsTemplate
) {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      // Character-specific fields not in templates
    });
  }

  /**
   * Check if character can advance
   */
  get canAdvance() {
    return true;
  }

  /**
   * Calculate available AP
   */
  get availableAP() {
    const exp = this.details?.experience || {};
    return (exp.total || 0) - (exp.spent || 0);
  }

  /**
   * Prepare derived data
   */
  prepareDerivedData() {
    // Calculate characteristic values
    for (const [key, char] of Object.entries(this.characteristics || {})) {
      char.value = (char.initial || 8) + (char.modifier || 0) + (char.advances || 0) + (char.gearmodifier || 0);
    }

    // Calculate base stats
    this._calculateLeP();
    this._calculateAeP();
    this._calculateSK();
    this._calculateZK();
    this._calculateGS();
    this._calculateINI();
  }

  _calculateLeP() {
    const stats = this.stats?.LeP;
    if (!stats) return;
    
    const ko = this.characteristics?.ko?.value || 8;
    stats.max = Math.round(ko * 2) + (stats.initial || 0) + (stats.advances || 0) + (stats.modifier || 0);
  }

  _calculateAeP() {
    const stats = this.stats?.AeP;
    if (!stats) return;
    
    stats.max = (stats.initial || 0) + (stats.advances || 0) + (stats.modifier || 0);
  }

  _calculateSK() {
    const stats = this.stats?.sk;
    if (!stats) return;
    
    const mu = this.characteristics?.mu?.value || 8;
    const kl = this.characteristics?.kl?.value || 8;
    const intu = this.characteristics?.in?.value || 8;
    stats.value = Math.round((mu + kl + intu) / 6) + (stats.initial || 0) + (stats.advances || 0) + (stats.modifier || 0);
  }

  _calculateZK() {
    const stats = this.stats?.zk;
    if (!stats) return;
    
    const ko = this.characteristics?.ko?.value || 8;
    const kk = this.characteristics?.kk?.value || 8;
    stats.value = Math.round((ko + ko + kk) / 6) + (stats.initial || 0) + (stats.advances || 0) + (stats.modifier || 0);
  }

  _calculateGS() {
    const stats = this.stats?.gs;
    if (!stats) return;
    
    stats.value = (stats.initial || 0) + (stats.modifier || 0);
  }

  _calculateINI() {
    const stats = this.stats?.ini;
    if (!stats) return;
    
    const mu = this.characteristics?.mu?.value || 8;
    const ge = this.characteristics?.ge?.value || 8;
    stats.value = Math.round((mu + ge) / 2) + (stats.modifier || 0);
  }
}
