import AdvantageRulesDSK from "../system/advantage-rules.js"
import DSKUtility from "../system/dsk_utility.js"
import ItemRulesDSK from "../system/item-rules.js"
import SpecialabilityRulesDSK from "../system/specialability-rules.js"

export default class WizardDSK extends Application {
    
    constructor(app) {
        super(app)
        this.items = []
        this.errors = []
        this.attributes = []
        this.updating = false
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.tabs = [{ navSelector: ".tabs", contentSelector: ".content", initial: "description" }]
        mergeObject(options, {
            classes: options.classes.concat(["dsk", "largeDialog"]),
            width: 750,
            height: 640,
        });
        options.resizable = true
        return options;
    }

    async updateSkill(skills, itemType, factor = 1, bonus = true) {
        let itemsToUpdate = []
        for (let skill of skills) {
            if(["", "-"].includes(skill.trim())) continue

            let parsed = DSKUtility.parseAbilityString(skill.trim())
            let res = this.actor.items.find(i => { return i.type == itemType && i.name == parsed.name });
            if (res) {
                let skillUpdate = duplicate(res)
                skillUpdate.system.level = Math.max(0, factor * parsed.step + (bonus ? Number(skillUpdate.system.level) : 0))
                itemsToUpdate.push(skillUpdate)
            } else {
                console.warn(`Could not find ${itemType} ${skill}`)
                this.errors.push(`${DSKUtility.categoryLocalization(itemType)}: ${skill}`)
            }
        }
        await this.actor.updateEmbeddedDocuments("Item", itemsToUpdate);
    }

    async findCompendiumItem(name, types){
        for(let type of types){
            const results = await game.dsk.itemLibrary.findCompendiumItem(name, type)
            //todo make sure this loads the right thing e.g. armory instead of core
            if(results.length && results[0].system) return results[0]
        }
        
        return undefined
    }

    async parseToItem(value, types) {
        if (value.trim() == "")
            return []

        return await Promise.all(value.split(", ").map(async(x) => {
            let parsed = DSKUtility.parseAbilityString(x.trim())
            let item = await this.findCompendiumItem(parsed.original, types)
            if (!item) {
                item = await this.findCompendiumItem(parsed.name, types)
            }
            if (!item) {
                console.warn(`Not found <${x}>`)
                const langCats = types.map(x => DSKUtility.categoryLocalization(x)).join("/")
                this.errors.push(`${langCats}: ${x}`)
                item = {
                    name: x.trim(),
                    notFound: true,
                    tooltip: game.i18n.localize('dsk.DSKError.itemNotFound'),
                    apCost: "?"
                }
            } else {
                const uuid = item.uuid
                item = duplicate(item)
                item.uuid = uuid
                item.tooltip = game.i18n.localize("dsk.details")
                item = ItemRulesDSK.reverseAdoptionCalculation(this.actor, parsed, item)
                if (item.system.ap) {
                    item.APunparseable = isNaN(item.system.ap)
                    item.apCost = item.APunparseable ? item.system.ap : parsed.step * Number(item.system.ap)
                }
            }
            item.replaceName = parsed.original
            item.step = parsed.step
            let actorHasItem = this.actor.items.find(y => types.includes(y.type) && y.name == parsed.original) != undefined
            item.disabled = actorHasItem || item.notFound || item.APunparseable
            if (actorHasItem)
                item.tooltip = game.i18n.localize("dsk.YouAlreadyHaveit")
            return item
        }))
    }

    activateListeners(html) {
        super.activateListeners(html)
        html.find('button.ok').click(() => {
            if (!this.updating) {
                this.updating = true
                this.updateCharacter().then(
                    () => this.updating = false
                )
            }
        })
        html.find('button.cancel').click(() => { this.close() })
        html.find('.show-item').click(ev => {
            let itemId = $(ev.currentTarget).attr("data-id")
            const item = this.items.find(i => i.id == itemId)
            item.sheet.render(true)
        })

        html.find('.optional').change(ev => {
            let parent = $(ev.currentTarget).closest('.content')
            let apCost = Number(parent.attr("data-cost"))
            parent.find('.optional:checked').each(function() {
                apCost += Number($(this).attr("data-cost"))
            });
            let elem = parent.find('.apCost')
            elem.text(apCost)
            WizardDSK.flashElem(elem, "emphasize2")
        })

        html.find('.exclusive').change(ev => {
            let parent = $(ev.currentTarget).closest('.content')
            let sel = $(ev.currentTarget).attr('data-sel')
            let maxDomElem = parent.find(`.allowedCount_${sel}`)
            let maxSelections = Number(maxDomElem.attr("data-count"))
            if (parent.find(`.exclusive_${sel}:checked`).length > maxSelections) {
                ev.currentTarget.checked = false
                WizardDSK.flashElem(maxDomElem)
                return
            }
        })
    }

    _validateInput(parent) {
        let exclusives = new Set()
        let regex = /^exclusive_/
        for (let k of parent.find('.exclusive')) {
            exclusives.add(k.className.split(/\s+/).filter(x => regex.test(x))[0])
        }
        for (let k of exclusives) {
            let choice = parent.find('.allowedCount_' + k.split("_")[1])
            let allowed = Number(choice.attr('data-count'))
            if (parent.find(`.${k}:checked`).length != allowed) {
                ui.notifications.error(game.i18n.localize("dsk.DSKError.MissingChoices"))
                WizardDSK.flashElem(choice)
                let tabElem = choice.closest('.tab').attr("data-tab")
                WizardDSK.flashElem(parent.find(`.tabs a[data-tab='${tabElem}']`))
                return false
            }
        }
        return true
    }

    async alreadyAdded(string, category) {
        if (string == "") return false

        let result = false
        result = await new Promise((resolve, reject) => {
            new Dialog({
                title: game.i18n.localize("dsk.DIALOG.warning"),
                content: game.i18n.format('dsk.DIALOG.alreadyAddedCharacterpart', { category: DSKUtility.categoryLocalization(category) }),
                default: 'ok',
                buttons: {
                    ok: {
                        icon: '<i class="fas fa-check"></i>',
                        label: game.i18n.localize('dsk.ok'),
                        default: true,
                        callback: () => {
                            resolve(false);
                        },
                    },
                    cancel: {
                        icon: '<i class="fas fa-close"></i>',
                        label: game.i18n.localize('dsk.cancel'),
                        default: true,
                        callback: () => {
                            resolve(true);
                        },
                    }
                }
            }).render(true);
        });
        return result
    }

    async addSelections(elems) {
        let itemsToAdd = []

        for (let k of elems) {
            const val = $(k).val()
            if (val == "") continue

            let item = await fromUuid($(k).val())
            let parsed = DSKUtility.parseAbilityString(item.name)
            item.name = $(k).attr("name")

            switch (item.type) {
                case "advantage":
                case "disadvantage":
                    item.system.level = Number($(k).attr("data-step"))
                    item = ItemRulesDSK.reverseAdoptionCalculation(this.actor, parsed, item)

                    if (!this.mergeLevels(itemsToAdd, item)) AdvantageRulesDSK.vantageAdded(this.actor, item)
                    break
                case "specialability":
                    item.system.level = Number($(k).attr("data-step"))

                    if ($(k).attr("data-free")) item.system.ap = 0

                    item = ItemRulesDSK.reverseAdoptionCalculation(this.actor, parsed, item)

                    if (!this.mergeLevels(itemsToAdd, item)) SpecialabilityRulesDSK.abilityAdded(this.actor, item)
                    break
            }
        }
        await this.actor.createEmbeddedDocuments("Item", itemsToAdd)
    }

    mergeLevels(itemsToAdd, item) {
        let merged = false
        let existing = itemsToAdd.find(x => x.name == item.name && x.type == item.type)
        if (existing) {
            merged = true
            let level = Number(getProperty(item, "system.level")) 
            if (level) {
                existing.system.level += level
            }
        } else {
            itemsToAdd.push(item)
        }
        return merged
    }

    static flashElem(elem, cssClass = "emphasize") {
        elem.addClass(cssClass)
        setTimeout(function() { elem.removeClass(cssClass) }, 600)
    }

    finalizeUpdate() {
        if (this.errors.length == 0) {
            this.close()
        } else {
            $(this._element).find('.dialog-buttons').html(`<div class="error"><p>${game.i18n.localize('dsk.DSKError.notUnderstood')}</p><ul><li>${this.errors.join("</li><li>")}</li></ul></div>`)
        }
    }
}