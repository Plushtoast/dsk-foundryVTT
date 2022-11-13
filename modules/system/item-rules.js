import DSK from './config.js'
import DSKUtility from './dsk_utility.js'

export default class ItemRulesDSK {
    static children = {}

    static simpleAdoption(item, adoption, name, source) {
        if (source[name].activeEffect) {
            const change = duplicate(source[name].activeEffect)
            change.value = `${adoption.name} ${change.value}`
            const activeEffect = {
                "changes": [change],
                "duration": {},
                "icon": "icons/svg/aura.svg",
                "label": `${name} (${adoption.name})`,
                "transfer": true,
                "flags": {
                    "dsk": {
                        "value": null,
                        "editable": true,
                        "description": `${name} (${adoption.name})`,
                        "custom": true,
                        "auto": null,
                        "manual": 0,
                        "hideOnToken": true,
                        "hidePlayers": false
                    }
                },
                "tint": ""
            }
            item.effects.push(activeEffect)
        }
    }

    static reverseAdoptionCalculation(actor, parsed, item) {
        const elems = [DSK.vantagesNeedingAdaption, DSK.AbilitiesNeedingAdaption]
        for (let elem of elems) {
            if (elem[parsed.name]) {
                let adoption = actor.items.find(x => elem[parsed.name].items.includes(x.type) && x.name == parsed.special)
                if (adoption) {
                    item.system.ap = item.system.ap.split("/")[adoption.system.StF.value.charCodeAt(0) - 65]
                    ItemRulesDSK.simpleAdoption(item, adoption, parsed.name, elem)
                }
                break
            }
        }
        return item
    }

    static hasItem(actor, name, types) {
        return actor.items.find(x => types.includes(x.type) && x.name == name) != undefined
    }

    static itemStep(actorData, name, types) {
        let item = actorData.items.find(x => types.includes(x.type) && x.name == name)
        if (item) {
            return Number(item.system.level)
        } else {
            return 0
        }
    }

    static itemAsModifier(actor, name, factor, types, startsWith = false, selected = false) {
        let res = []
        const regex = startsWith ? new RegExp(`^${DSKUtility.escapeRegex(`${name} (`)}`) : new RegExp(`^${DSKUtility.escapeRegex(name)}$`)
        const item = actor.items.find(x => types.includes(x.type) && regex.test(x.name))
        if (item) {
            res.push({
                name: item.name,
                value: Number(item.system.level) * factor,
                selected,
                source: item.name
            })
        }
        return res
    }
}