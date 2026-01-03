// Combatant DataModels
import { DSACombatantDataModel } from "./combatant/dsacombatant.js";

// Actor DataModels
import CharacterData from './actor/character.js';
import CreatureData from './actor/creature.js';
import NpcData from './actor/npc.js';

// Item DataModels
import AdvantageData from './item/advantage.js';
import AhnengeschenkData from './item/ahnengeschenk.js';
import AhnengabeData from './item/ahnengabe.js';
import AmmunitionData from './item/ammunition.js';
import ArmorData from './item/armor.js';
import CombatskillData from './item/combatskill.js';
import ConsumableData from './item/consumable.js';
import CultureData from './item/culture.js';
import DisadvantageData from './item/disadvantage.js';
import EffectwrapperData from './item/effectwrapper.js';
import EquipmentData from './item/equipment.js';
import InformationData from './item/information.js';
import MeleeweaponData from './item/meleeweapon.js';
import PoisonData from './item/poison.js';
import ProfessionData from './item/profession.js';
import RangeweaponData from './item/rangeweapon.js';
import SkillData from './item/skill.js';
import SpecialabilityData from './item/specialability.js';
import SpeciesData from './item/species.js';
import TraitData from './item/trait.js';

export const CombatantDataModels = {
    dsacombatant: DSACombatantDataModel
};

export const DSK_ACTOR_MODELS = {
  character: CharacterData,
  creature: CreatureData,
  npc: NpcData,
};

export const DSK_ITEM_MODELS = {
  advantage: AdvantageData,
  ahnengeschenk: AhnengeschenkData,
  ahnengabe: AhnengabeData,
  ammunition: AmmunitionData,
  armor: ArmorData,
  combatskill: CombatskillData,
  consumable: ConsumableData,
  culture: CultureData,
  disadvantage: DisadvantageData,
  effectwrapper: EffectwrapperData,
  equipment: EquipmentData,
  information: InformationData,
  meleeweapon: MeleeweaponData,
  poison: PoisonData,
  profession: ProfessionData,
  rangeweapon: RangeweaponData,
  skill: SkillData,
  specialability: SpecialabilityData,
  species: SpeciesData,
  trait: TraitData,
};

/**
 * Register all DataModels with the Foundry system
 * Call this in system initialization
 */
export function registerDataModels() {
  // Register Combatant DataModels
  Object.assign(CONFIG.Combatant.dataModels, CombatantDataModels);
  
  // Register Actor DataModels
  Object.assign(CONFIG.Actor.dataModels, DSK_ACTOR_MODELS);
  
  // Register Item DataModels
  Object.assign(CONFIG.Item.dataModels, DSK_ITEM_MODELS);
}