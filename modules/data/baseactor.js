import DSKUtility from '../system/dsk_utility.js';
import DSK from '../system/config.js';
import { DSKDataModel } from './abstract.js';

/**
 * Base DataModel class for all DSK actors
 * Provides common functionality for actor data handling
 */
export class ActorDataModel extends DSKDataModel {
  
  prepareBaseData() {
    this.parent.auras = [];
    this._initializeBaseStructure();
  }

  _initializeBaseStructure() {
    foundry.utils.mergeObject(this, {
      itemModifiers: {},
      condition: {},
      skillModifiers: this._createSkillModifiersStructure(),
      status: this._createStatusStructure(),
      repeatingEffects: {
        startOfRound: {
          wounds: [],
          astralenergy: [],
        },
      },
      totalArmor: 0,
      carryModifier: 0,
      vulnerabilities: [],
      resistances: [],
      immunities: [],
      meleeStats: this._createMeleeStatsStructure(),
      rangeStats: this._createRangeStatsStructure(),
      defaultWeapon: this._createDefaultWeaponStructure(),
    });

    // Initialize gear modifiers for calculated attributes
    for (const k of DSK.gearModifyableCalculatedAttributes || []) {
      if (this.status[k]) this.status[k].gearmodifier = 0;
    }

    // Initialize gear modifiers for characteristics
    if (this.characteristics) {
      for (let ch of Object.values(this.characteristics)) {
        ch.gearmodifier = 0;
      }
    }
  }

  _createSkillModifiersStructure() {
    return {
      FP: [],
      step: [],
      QL: [],
      TPM: [],
      FW: [],
      botch: 20,
      crit: 1,
      global: [],
      combat: {
        step: [],
        parry: [],
        attack: [],
        damage: [],
      },
    };
  }

  _createStatusStructure() {
    return {
      wounds: { gearmodifier: 0 },
      astralenergy: { gearmodifier: 0 },
      soulpower: { gearmodifier: 0 },
      toughness: { gearmodifier: 0 },
      speed: { gearmodifier: 0 },
      dodge: { gearmodifier: 0 },
    };
  }

  _createMeleeStatsStructure() {
    return {
      attack: 0,
      parry: 0,
      damage: '0',
    };
  }

  _createRangeStatsStructure() {
    return {
      attack: 0,
      damage: '0',
    };
  }

  _createDefaultWeaponStructure() {
    return {
      attack: 0,
      parry: 0,
      damage: '',
      range: '',
    };
  }

  /**
   * Calculate base initiative value
   * @param {Object} data - Actor data
   */
  baseInitiative(data) {
    const ini = data.status?.initiative || this.status?.initiative;
    if (ini) {
      ini.value = (ini.current || 0) + (ini.modifier || 0);
    }
  }
}
