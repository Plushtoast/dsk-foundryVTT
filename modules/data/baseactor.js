import DSKUtility from '../system/dsk_utility.js';
import DSK from '../system/config.js';
import SpecialabilityRulesDSK from '../system/specialability-rules.js';
import { DSKDataModel } from './abstract.js';

const { getProperty } = foundry.utils;

/**
 * Base DataModel class for all DSK actors
 * Provides common functionality for actor data handling
 */
export class ActorDataModel extends DSKDataModel {
  static _baseCarryItems = new Set(["armor", "meleeweapon", "ammunition", "rangeweapon", "plant", "poison", "money", "consumable", "equipment"])
  static _mageSpecs = new Set(["ahnen"])
  
  prepareBaseData() {
    this.parent.auras = [];
    this._initializeBaseStructure();
  }

  _initializeBaseStructure() {
    foundry.utils.mergeObject(this, {
      itemModifiers: {},
      condition: {},
      skillModifiers: this._createSkillModifiersStructure(),
      repeatingEffects: {
        startOfRound: {
          LeP: [],
          AeP: []
        },
      },
      aepModifier: 0,
      creatureBonus: [],
      status: {
        encumbered: 0,
        stunned: 0,
        feared: 0,
        inpain: 0,
        selfconfidence: 0
      },
      spellStats: {
        damage: "0",
      },
      meleeStats: this._createMeleeStatsStructure(),
      rangeStats: this._createRangeStatsStructure(),
      totalArmor: 0,
      carryModifier: 0,
    });

    // Initialize gear modifiers for stats
    if (this.stats) {
      for (const k of Object.values(this.stats)) {
        k.gearmodifier = 0;
      }
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
      conditional: {
        AePCost: []
      },
      feature: {
        FP: [],
        step: [],
        QL: [],
        TPM: [],
        FW: [],
        AePCost: [],
      },
      ...["ahnengabe", "skill"].reduce((prev, x) => {
        prev[x] = {
          FP: [],
          step: [],
          QL: [],
          TPM: [],
          FW: [],
        };
        return prev;
      }, {}),
    };
  }

  _createMeleeStatsStructure() {
    return {
      parry: 0,
      attack: 0,
      damage: "0",
      defenseMalus: 0,
      botch: 20,
      crit: 1,
    };
  }

  _createRangeStatsStructure() {
    return {
      attack: 0,
      damage: "0",
      defenseMalus: 0,
      botch: 20,
      crit: 1,
    };
  }

  prepareDerivedData() {
    try {
      this._updateCharacteristics();
      this._calculateWeightAndContainer();
      this._identifyCharacterType();
      this._calculateBasicAttributes();
      this._calculateEnergyPoints();
      this._applyConditionsAndMovement();
    } catch (error) {
      console.error(`Error preparing actor data for ${this.parent.name}:`, error);
      ui.notifications.error(game.i18n.format("dsk.DSKError.PreparationError", { name: this.parent.name }) + error.message);
    }
  }

  _updateCharacteristics() {
    for (const ch of Object.values(this.characteristics || {})) {
      ch.value = ch.initial + ch.advances + (ch.modifier || 0) + ch.gearmodifier;
    }
  }

  _calculateWeightAndContainer() {
    this.totalWeight = 0;
    const wornArmor = [];

    // Build container map
    const containers = new Map();
    const bags = this.parent.items.filter(x => x.type === "equipment" && x.system.category === "bags");
    for (const container of bags) {
      containers.set(container.id, []);
    }

    // First pass - assign items to containers and calculate base weights
    this._processItemWeights(containers, wornArmor);

    // Second pass - process bag weights recursively
    this._processBagWeights(bags, containers);

    this.armorEncumbrance = this._getArmorEncumbrance(wornArmor);
    this.carrycapacity = (this.characteristics?.kk?.value || 8) * 2 + this.carryModifier;
  }

  _processItemWeights(containers, wornArmor) {
    for (const item of this.parent.items) {
      if (ActorDataModel._baseCarryItems.has(item.type)) {
        const parentId = getProperty(item, "system.parent_id");
        if (parentId && parentId !== item._id && containers.has(parentId)) {
          containers.get(parentId).push(item);
          continue;
        }

        if (item.type === "armor") {
          item.system.preparedWeight = parseFloat((item.system.weight * item.system.quantity).toFixed(3));
          this.totalWeight += parseFloat(
            (item.system.weight * (item.system.worn.value ? Math.max(0, item.system.quantity - 1) : item.system.quantity)).toFixed(3)
          );
          if (item.system.worn.value) wornArmor.push(item);
        } else {
          item.system.preparedWeight = parseFloat((item.system.weight * item.system.quantity).toFixed(3));
          this.totalWeight += Number(item.system.preparedWeight);
        }
      } else {
        switch (item.type) {
          case "ahnengabe":
          case "ahnengeschenk":
            this.isMage = true;
            break;
          case "specialability":
            if (ActorDataModel._mageSpecs.has(item.system.category)) this.isMage = true;
            break;
        }
      }
    }
  }

  _processBagWeights(bags, containers) {
    for (const bag of bags) {
      const parentId = getProperty(bag, "system.parent_id");
      if (!parentId || !containers.has(parentId)) {
        this.totalWeight += this._calcBagweight(bag, containers, true);
      }
    }
  }

  _calcBagweight(elem, containers, topLevel = true) {
    let totalWeight = 0;
    if (containers.has(elem._id)) {
      let bagweight = 0;
      if (!elem.system.worn.value && topLevel) totalWeight -= elem.system.preparedWeight;

      for (const child of containers.get(elem._id)) {
        child.system.preparedWeight = Number(parseFloat((child.system.weight * child.system.quantity).toFixed(3)));

        if (containers.has(child._id)) {
          bagweight += this._calcBagweight(child, containers, false);
        } else {
          bagweight += child.system.preparedWeight;
        }
      }

      if (!topLevel) {
        totalWeight += bagweight + elem.system.preparedWeight;
      } else if (elem.system.worn.value) {
        totalWeight += bagweight;
      }

      elem.system.bagweight = `${bagweight.toFixed(3)}/${elem.system.capacity || 0}`;
    }
    return totalWeight;
  }

  /**
   * Whether this actor can advance (spend AP)
   * Override in subclasses that should not be able to advance
   */
  get canAdvance() {
    return this.parent.isOwner && this.parent.type === "character";
  }

  _identifyCharacterType() {
    this.parent.canAdvance = this.canAdvance;

    if (this.canAdvance) {
      this.details.experience.current = this.details.experience.total - this.details.experience.spent;
    }
  }

  _calculateBasicAttributes() {
    const actorType = this.parent.type;
    
    if (actorType === "character" || actorType === "npc") {
      this._calculateCharacterAttributes();
    } else if (actorType === "creature") {
      this._calculateCreatureAttributes();
    }

    // Common calculations
    this.stats.schips.max = 
      Number(this.stats.schips.current) + Number(this.stats.schips.modifier) + this.stats.schips.gearmodifier;

    this.stats.regeneration.LePmax =
      this.stats.regeneration.LePTemp + this.stats.regeneration.LePMod + this.stats.regeneration.LePgearmodifier;
    this.stats.regeneration.AePmax =
      this.stats.regeneration.AePTemp + this.stats.regeneration.AePMod + this.stats.regeneration.AePgearmodifier;
  }

  _calculateCharacterAttributes() {
    const chars = this.characteristics;
    
    this.stats.LeP.current = this.stats.LeP.initial + chars.ko.value * 2;
    this.stats.AeP.current = (!this.guidevalue || this.guidevalue === "-") ? 0 : this._attrFromCharacteristic(this.guidevalue);
    
    this.stats.sk.value =
      (this.stats.sk.initial || 0) +
      Math.round((chars.mu.value + chars.kl.value + chars.in.value) / 3) - 10;
    this.stats.zk.value =
      (this.stats.zk.initial || 0) +
      Math.round((chars.ko.value + chars.ko.value + chars.kk.value) / 3) - 10;
    this.stats.ini.value =
      Math.round((chars.mu.value + chars.ge.value) / 2) +
      (this.stats.ini.modifier || 0);

    this.stats.LeP.min = -1 * chars.ko.value;
  }

  _calculateCreatureAttributes() {
    this.stats.LeP.current = this.stats.LeP.initial;
    this.stats.AeP.current = this.stats.AeP.initial;
    this.stats.ini.value = this.stats.ini.current + (this.stats.ini.modifier || 0);
  }

  _attrFromCharacteristic(char) {
    return this.characteristics[char]?.value || 0;
  }

  _calculateEnergyPoints() {
    this.stats.LeP.max = Math.round(
      (this.stats.LeP.current + this.stats.LeP.modifier + this.stats.LeP.advances) * (this.stats.LeP.multiplier || 1) +
      this.stats.LeP.gearmodifier
    );
    this.stats.AeP.max =
      this.stats.AeP.current +
      this.stats.AeP.modifier +
      this.stats.AeP.advances +
      this.stats.AeP.gearmodifier;

    this.stats.gs.max = Math.max(0, this.stats.gs.initial + (this.stats.gs.modifier || 0) + this.stats.gs.gearmodifier);

    this.stats.sk.max = this.stats.sk.value + this.stats.sk.modifier + this.stats.sk.gearmodifier;
    this.stats.zk.max = this.stats.zk.value + this.stats.zk.modifier + this.stats.zk.gearmodifier;
  }

  _applyConditionsAndMovement() {
    const encumbrance = 0;
    this.stats.ini.value += this.stats.ini.gearmodifier - Math.min(4, encumbrance);
    const baseInit = Number((0.01 * this.stats.ini.value).toFixed(2));
    this.stats.ini.value *= this.stats.ini.multiplier || 1;
    this.stats.ini.value = Math.round(this.stats.ini.value) + baseInit;

    for (const key of Object.keys(this.status)) {
      this.status[key] = Math.clamp(this.status[key], 0, 8);
    }
  }

  _getArmorEncumbrance(wornArmors) {
    const encumbrance = wornArmors.reduce((sum, a) => {
      return sum + a.system.encumbrance;
    }, 0);
    return Math.max(
      0,
      encumbrance - SpecialabilityRulesDSK.abilityStep(this.parent, game.i18n.localize("dsk.LocalizedIDs.inuredToEncumbrance"))
    );
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
