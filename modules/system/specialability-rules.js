import DSK from "./config.js";
import ItemRulesDSK from "./item-rules.js";

export default class SpecialabilityRulesDSK extends ItemRulesDSK {

    static setupFunctions() {}

    static async abilityAdded(actor, item) {
        if (DSK.addAbilityRules[item.name]) {
            DSK.addAbilityRules[item.name](actor, item)
        }
    }
    static async abilityRemoved(actor, item) {
        if (DSK.removeAbilityRules[item.name]) {
            DSK.removeAbilityRules[item.name](actor, item)
        }
        let xpCost = item.system.ap * item.system.level
        if (/;/.test(item.system.ap)) {
            let steps = item.system.ap.split(";").map(x => Number(x.trim()))
            xpCost = 0
            for (let i = 0; i < item.system.level; i++)
                xpCost += steps[i]
        }
        await actor._updateAPs(-1 * xpCost)
    }

    static async _specialabilityReturnFunction(actor, item, typeClass, adoption) {
        if (item == null) return

        item = duplicate(item)

        if (adoption != null) {
            //Different Apval for multiple same vantages
            if (/,/.test(item.system.ap)) {
                let name = `${item.name.replace(' ()', '')} (${adoption.name}`
                item.system.ap = item.system.ap.split(",")[actor.items.filter(x => x.type == item.type && x.name.includes(name)).length].trim()
            }
            SpecialabilityRulesDSK.simpleAdoption(item, adoption, item.name, DSK.AbilitiesNeedingAdaption)

            item.name = `${item.name.replace(' ()', '')} (${adoption.name}${adoption.customEntry ? ", " + adoption.customEntry : ''})`
            
            if (adoption.data && adoption.system.StF && /\//.test(item.system.ap))
                item.system.ap = item.system.ap.split("/")[adoption.system.StF.charCodeAt(0) - 65].trim()
        }
        let res = actor.items.find(i => {
            return i.type == typeClass && i.name == item.name
        });

        if (res) {
            let vantage = duplicate(res)
            let xpCost = /;/.test(vantage.system.ap) ? vantage.system.ap.split(';').map(x => Number(x.trim()))[vantage.system.level] : vantage.system.ap
            if (vantage.system.level + 1 <= vantage.system.max && await actor.checkEnoughXP(xpCost)) {
                vantage.system.level += 1
                await actor._updateAPs(xpCost)
                await actor.updateEmbeddedDocuments("Item", [vantage]);
                await SpecialabilityRulesDSK.abilityAdded(actor, vantage)
            }
        } else {
            let xpCost = item.system.ap.split(';').map(x => x.trim())[0]
            if (await actor.checkEnoughXP(xpCost)) {
                await SpecialabilityRulesDSK.abilityAdded(actor, item)
                await actor._updateAPs(xpCost)
                await actor.createEmbeddedDocuments("Item", [item]);
            }
        }
    }

    static async needsAdoption(actor, item, typeClass) {
        let rule = DSK.AbilitiesNeedingAdaption[item.name]
        if (rule) {
            let template
            let callback
            if (rule.items == "text") {
                template = await renderTemplate('systems/dsk/templates/dialog/requires-adoption-string-dialog.html', { original: item })
                callback = function(dlg) {
                    let adoption = { name: dlg.find('[name="entryselection"]').val() }
                    SpecialabilityRulesDSK._specialabilityReturnFunction(actor, item, typeClass, adoption)
                }
            } else {
                if (rule.items == "array") {
                    let items = rule.elems.map(x => { return { name: x } })
                    template = await renderTemplate('systems/dsk/templates/dialog/requires-adoption-dialog.html', { items: items, original: item, area: rule.area })
                    callback = function(dlg) {
                        let adoption = items.find(x => x.name == dlg.find('[name="entryselection"]').val())
                        SpecialabilityRulesDSK._specialabilityReturnFunction(actor, item, typeClass, adoption)
                    }
                } else {
                    let items = actor.items.filter(x => rule.items.includes(x.type)).sort((a, b) => a.name.localeCompare(b.name))
                    template = await renderTemplate('systems/dsk/templates/dialog/requires-adoption-dialog.html', { items: items, original: item, area: rule.area })
                    callback = function(dlg) {
                        let adoption = items.find(x => x.name == dlg.find('[name="entryselection"]').val())
                        adoption.customEntry = dlg.find('[name="custom"]').val()
                        SpecialabilityRulesDSK._specialabilityReturnFunction(actor, item, typeClass, adoption)
                    }
                }
            }
            await new Dialog({
                title: game.i18n.localize("dsk.DIALOG.ItemRequiresAdoption"),
                content: template,
                buttons: {
                    Yes: {
                        icon: '<i class="fa fa-check"></i>',
                        label: game.i18n.localize("dsk.yes"),
                        callback: callback
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: game.i18n.localize("dsk.cancel")
                    },
                },
                default: 'Yes'
            }).render(true)
        } else {
            SpecialabilityRulesDSK._specialabilityReturnFunction(actor, item, typeClass, null)
        }
    }

    static hasAbility(actorData, talent) {
        return super.hasItem(actorData, talent, ["specialability"])
    }

    static abilityStep(actorData, talent) {
        return super.itemStep(actorData, talent, ["specialability"])
    }

    static abilityAsModifier(actor, talent, factor = 1, startsWith = false) {
        return super.itemAsModifier(actor, talent, factor, ["specialability"], startsWith)
    }

}

ItemRulesDSK.children["SpecialabilityRulesDSK"] = SpecialabilityRulesDSK