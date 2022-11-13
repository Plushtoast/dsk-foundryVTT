import ItemRulesDSK from "./item-rules.js"
import DSK from "./config.js"

export default class AdvantageRulesDSK extends ItemRulesDSK {
    static setupFunctions() {}
    static async vantageAdded(actor, item) {
        if (game.dsk.config.addvantageRules[item.name])
            game.dsk.config.addvantageRules[item.name](actor, item)
    }
    static async vantageRemoved(actor, item) {
        if (game.dsk.config.removevantageRules[item.name])
            game.dsk.config.removevantageRules[item.name](actor, item)
    }


    /** APValue formatting: / for Stf steps starting with A         */
    /** APValue formatting: , for first, second .. variant of element  */
    /** APValue formatting: ; for first second .. step */
    /**  */

    static async _vantageReturnFunction(actor, item, typeClass, adoption) {
        if (item == null)
            return
        item = duplicate(item)

        //Different Apval for multiple same vantages
        if (/,/.test(item.system.ap)) {
            let name = item.name.replace(' ()', '')
            item.system.ap = item.system.ap.split(",")[actor.items.filter(x => x.type == item.type && x.name.includes(name)).length].trim()
        }

        if (adoption != null) {
            AdvantageRulesDSK.simpleAdoption(item, adoption, item.name, DSK.vantagesNeedingAdaption)
            item.name = `${item.name.replace(' ()', '')} (${adoption.name})`
            if (adoption.data)
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
                await AdvantageRulesDSK.vantageAdded(actor, vantage)
            }
        } else if (await actor.checkEnoughXP(item.system.ap.split(';').map(x => x.trim())[0])) {
            await AdvantageRulesDSK.vantageAdded(actor, item)
            await actor._updateAPs(item.system.ap.split(';').map(x => x.trim())[0])
            await actor.createEmbeddedDocuments("Item", [item]);
        }
    }

    static async needsAdoption(actor, item, typeClass) {
        if (DSK.vantagesNeedingAdaption[item.name]) {
            let template
            let callback
            if (DSK.vantagesNeedingAdaption[item.name].items == "text") {
                template = await renderTemplate('systems/dsk/templates/dialog/requires-adoption-string-dialog.html', { original: item })
                callback = function(dlg) {
                    let adoption = { name: dlg.find('[name="entryselection"]').val() }
                    AdvantageRulesDSK._vantageReturnFunction(actor, item, typeClass, adoption)
                }
            } else {
                let items = actor.items.filter(x => DSK.vantagesNeedingAdaption[item.name].items.includes(x.type))
                template = await renderTemplate('systems/dsk/templates/dialog/requires-adoption-dialog.html', { items: items, original: item })
                callback = function(dlg) {
                    let adoption = items.find(x => x.name == dlg.find('[name="entryselection"]').val())
                    AdvantageRulesDSK._vantageReturnFunction(actor, item, typeClass, adoption)
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
            AdvantageRulesDSK._vantageReturnFunction(actor, item, typeClass, null)
        }
    }

    static hasVantage(actor, talent) {
        return super.hasItem(actor, talent, ["advantage", "disadvantage"])
    }

    static vantageStep(actor, talent) {
        return super.itemStep(actor, talent, ["advantage", "disadvantage"])
    }

    static getVantageAsModifier(actor, talent, factor = 1, startsWith = false, selected = false) {
        return super.itemAsModifier(actor, talent, factor, ["advantage", "disadvantage"], startsWith, selected)
    }
}

ItemRulesDSK.children["AdvantageRulesDSK"] = AdvantageRulesDSK