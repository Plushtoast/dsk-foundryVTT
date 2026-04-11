import { ActorDataModel } from '../baseactor.js';
import CharacteristicsTemplate from './templates/characteristics.js';
import DetailsTemplate from './templates/details.js';
import MerchantTemplate from './templates/merchant.js';
import StatusTemplate from './templates/status.js';

const { SchemaField, StringField } = foundry.data.fields;

/**
 * DataModel for NPC actors
 */
export default class NpcData extends ActorDataModel.mixin(
  CharacteristicsTemplate,
  MerchantTemplate,
  StatusTemplate,
  DetailsTemplate
) {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      // NPC uses same structure as character but without experience tracking
    });
  }

  /**
   * NPCs cannot advance
   */
  get canAdvance() {
    return false;
  }

  _calculateStats() {
    // Calculate LeP
    const LeP = this.stats?.LeP;
    if (LeP) {
      const ko = this.characteristics?.ko?.value || 8;
      LeP.max = Math.round(ko * 2) + (LeP.initial || 0) + (LeP.advances || 0) + (LeP.modifier || 0);
    }

    // Calculate AeP
    const AeP = this.stats?.AeP;
    if (AeP) {
      AeP.max = (AeP.initial || 0) + (AeP.advances || 0) + (AeP.modifier || 0);
    }

    // Calculate SK
    const sk = this.stats?.sk;
    if (sk) {
      const mu = this.characteristics?.mu?.value || 8;
      const kl = this.characteristics?.kl?.value || 8;
      const intu = this.characteristics?.in?.value || 8;
      sk.value = Math.round((mu + kl + intu) / 6) + (sk.initial || 0) + (sk.advances || 0) + (sk.modifier || 0);
    }

    // Calculate ZK
    const zk = this.stats?.zk;
    if (zk) {
      const ko = this.characteristics?.ko?.value || 8;
      const kk = this.characteristics?.kk?.value || 8;
      zk.value = Math.round((ko + ko + kk) / 6) + (zk.initial || 0) + (zk.advances || 0) + (zk.modifier || 0);
    }

    // Calculate GS
    const gs = this.stats?.gs;
    if (gs) {
      gs.value = (gs.initial || 0) + (gs.modifier || 0);
    }

    // Calculate INI
    const ini = this.stats?.ini;
    if (ini) {
      const mu = this.characteristics?.mu?.value || 8;
      const ge = this.characteristics?.ge?.value || 8;
      ini.value = Math.round((mu + ge) / 2) + (ini.modifier || 0);
    }
  }
}
