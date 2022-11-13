
import DSK from "./config.js"
import ItemRulesDSK from "./item-rules.js"

export default class TraitRulesDSK extends ItemRulesDSK {
    static async traitAdded(actor, item) {
        if (DSK.addTraitRules[item.name]) await DSK.addTraitRules[item.name](actor, item)
    }

    static hasTrait(actor, talent) {
        return super.hasItem(actor, talent, ["trait"])
    }
}