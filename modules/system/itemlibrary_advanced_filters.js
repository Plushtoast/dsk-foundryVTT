import DSKUtility from "./dsk_utility.js"
import DSK from "./config.js"

let ADVANCEDFILTERS = {}

Hooks.once("ready", () => {

  Promise.all([DSKUtility.allSkillsList()]).then((result) => {
    const skills = result[0].skills.reduce((prev, now) => ({ ...prev, [now]: now }), {})
    const range = result[0].rangeSkills.reduce((prev, now) => ({ ...prev, [now]: now }), {})
    const melee = result[0].meleeSkills.reduce((prev, now) => ({ ...prev, [now]: now }), {})
    const allCombat = result[0].rangeSkills.concat(result[0].meleeSkills).reduce((prev, now) => ({ ...prev, [now]: now }), {})

    mergeObject(ADVANCEDFILTERS, {
      ammunition: [
        { label: "dsk.ammunitionType", attr: "ammunitionType", type: "select", options: DSK.ammunitiongroups }
      ],
      equipment: [
        { label: "dsk.category", attr: "category", type: "select", options: DSK.equipmentTypes }
      ],
      rangeweapon: [
        { label: "TYPES.Item.combatskill", attr: "combatskill", type: "select", options: range },
        { label: "dsk.ammunitionType", attr: "ammunitionType", type: "select", options: DSK.ammunitiongroups }
      ],
      meleeweapon: [
        { label: "TYPES.Item.combatskill", attr: "combatskill", type: "select", options: melee },
        { label: "dsk.range", attr: "rw", type: "select", options: DSK.meleeRanges }
      ],
      poison: [
        { label: "dsk.resistanceModifier", attr: "resist", type: "select", options: DSK.magicResistanceModifiers },
      ],
      trait: [
      ],
      profession: [
      ],
      specialability: [
        { label: "dsk.category", attr: "category", type: "select", options: DSK.specialAbilityCategories },
        { label: "TYPES.Item.combatskill", attr: "subcategory", type: "select", options: allCombat, notStrict: true }
      ],
      ahnengabe: [
        { label: "dsk.resistanceModifier", attr: "resist", type: "select", options: DSK.magicResistanceModifiers },
        { label: "dsk.targetCategory", attr: "targetCategory", type: "text" },
        { label: "dsk.distribution", attr: "distribution", type: "text" }
      ],
      ahnengeschenk: [],
     
      npc: [
        { label: "TYPES.Item.species", attr: "details.species", type: "text" },
        { label: "TYPES.Item.profession", attr: "details.profession", type: "text" },
        { label: "TYPES.Item.culture", attr: "details.culture", type: "text" }
      ],
      character: [
        { label: "TYPES.Item.species", attr: "details.species", type: "text" },
        { label: "TYPES.Item.profession", attr: "details.profession", type: "text" },
        { label: "TYPES.Item.culture", attr: "details.culture", type: "text" }
      ],
      creature: [
        { label: "TYPES.Item.species", attr: "details.species", type: "text" },
        { label: "dsk.sizeCategory", attr: "details.size", type: "select", options: DSK.sizeCategories }
      ],
      armor: [ 
        { label: "dsk.protection", attr: "rs", type: "select", options: { "0": "0", "1": "1", "2": "2", "3": "3", "4": "4", "5": "5", "6": "6", "7": "7" } },
      ],

    })
  })
})

export default ADVANCEDFILTERS