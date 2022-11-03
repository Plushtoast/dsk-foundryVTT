import DSKUtility from "./dsk_utility.js"

let ADVANCEDFILTERS = {}

Hooks.once("ready", () => {

  Promise.all([DSKUtility.allSkillsList()]).then((result) => {
    const skills = result[0].skills.reduce((prev, now) => ({ ...prev, [now]: now }), {})
    const range = result[0].rangeSkills.reduce((prev, now) => ({ ...prev, [now]: now }), {})
    const melee = result[0].meleeSkills.reduce((prev, now) => ({ ...prev, [now]: now }), {})
    const allCombat = result[0].rangeSkills.concat(result[0].meleeSkills).reduce((prev, now) => ({ ...prev, [now]: now }), {})

    mergeObject(ADVANCEDFILTERS, {
      ammunition: [
      ],
      equipment: [
      ],
      rangeweapon: [
      ],
      meleeweapon: [
      ],
      poison: [
      ],
      trait: [
      ],
      profession: [
      ],
      specialability: [
      ],
      ahnengabe: [],
      ahnengeschenk: [],

      npc: [
      ],
      character: [
      ],
      creature: [
      ],
      armor: [ 
      ],

    })
  })
})

export default ADVANCEDFILTERS