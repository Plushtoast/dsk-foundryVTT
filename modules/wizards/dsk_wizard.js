import AdvantageRulesDSK from "../system/advantage-rules.js"
import DSKUtility from "../system/dsk_utility.js"
import ItemRulesDSK from "../system/item-rules.js"
import SpecialabilityRulesDSK from "../system/specialability-rules.js"
import { DefaultAppv2 } from "../actor/baseapp.js";
const { mergeObject, duplicate, getProperty } = foundry.utils

export default class WizardDSK extends DefaultAppv2 {
    static DEFAULT_OPTIONS = {
        classes: ['dsk', 'largeDialog'],
        position: {
            width: 750,
            height: 640,
        },
        window: {
            resizable: true,
        },
        actions: {
            ok: this._onOk,
            cancel: this._onCancel,
            showItem: this._showItem,
        },
    };

    static TABS = {
        sheet: {
            tabs: [
                { id: 'description', label: 'Description' },
            ],
            initial: 'description',
        },
    };

    filterTabs(data) {
        for (let tab of Object.keys(data.tabs)) {
            if (!data[data.tabs[tab].id]) delete data.tabs[tab]
        }
    }

    constructor(options = {}) {
        super(options)
        this.items = []
        this.errors = []
        this.attributes = []
        this.updating = false
    }

    // Static action handlers
    static _onOk(ev, target) {
        if (!this.updating) {
            this.updating = true
            this.updateCharacter().then(
                () => this.updating = false
            )
        }
    }

    static _onCancel(ev, target) {
        this.close()
    }

    static _showItem(ev, target) {
        let itemId = target.dataset.id
        const item = this.items.find(i => i.id == itemId)
        item.sheet.render(true)
    }

    async updateSkill(skills, itemType, factor = 1, bonus = true) {
        const typesToSearch = Array.isArray(itemType) ? itemType : [itemType];
        let itemsToUpdate = []
        for (let skill of skills) {
            if(["", "-"].includes(skill.trim())) continue

            let parsed = DSKUtility.parseAbilityString(skill.trim())
            let res = this.actor.items.find(i => { return typesToSearch.includes(i.type) && i.name == parsed.name });
            if (res) {
                let skillUpdate = duplicate(res)
                skillUpdate.system.level = Math.max(0, factor * parsed.step + (bonus ? Number(skillUpdate.system.level) : 0))
                itemsToUpdate.push(skillUpdate)
            } else {
                console.warn(`Could not find ${typesToSearch.join(",")} ${skill}`)
                this.errors.push(`${typesToSearch.map(x => DSKUtility.categoryLocalization(x)).join(", ")}: ${skill}`)
            }
        }
        await this.actor.updateEmbeddedDocuments("Item", itemsToUpdate, {}, { render: false });
    }

    async findCompendiumItem(name, types){
        for(let type of types){
            const results = await game.dsk.itemLibrary.findCompendiumItem(name, type)
            //todo make sure this loads the right thing e.g. armory instead of core
            if(results.length) return results.find((x) => x.name == name && x.type == type && x.system);
        }
        
        return undefined
    }

    async parseToItem(value, types) {
        if (value.trim() == "" || value.trim() == "-") 
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

    _onRender(context, options) {
        super._onRender(context, options);
        const html = $(this.element);

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

    _validateInput(parent, app = this) {
        let regex = /^exclusive_/
        for (let tab of parent.find('.tab')) {
            const tb = $(tab)
            let exclusives = new Set()
            for (let k of tb.find('.exclusive')) {
                exclusives.add(k.className.split(/\s+/).filter(x => regex.test(x))[0])
            }
            for (let k of exclusives) {
                let choice = tb.find('.allowedCount_' + k.split("_")[1])
                let allowed = Number(choice.attr('data-count'))
                if (tb.find(`.${k}:checked`).length != allowed) {
                    this._showInputValidation(choice, tb, app)
                    return false
                }
            }
        }
        return true
    }

    _showInputValidation(choice, parent, app){
        ui.notifications.error("dsk.DSKError.MissingChoices", { localize: true })
        const tabElem = choice.closest('.tab')[0]?.dataset
        if (tabElem?.tab) {
            const group = tabElem.group || 'sheet'
            app.changeTab(tabElem.tab, group)
            WizardDSK.flashElem(parent.find(`.tabs a[data-tab='${tabElem.tab}']`))
        }
        WizardDSK.flashElem(choice.closest("div"))
    }

    async alreadyAdded(string, category) {
        if (string == "") return false

        let result = false
        result = await new Promise((resolve, reject) => {
            foundry.applications.api.DialogV2.wait({
                window: { title: "dsk.DIALOG.warning" },
                content: game.i18n.format('dsk.DIALOG.alreadyAddedCharacterpart', { category: DSKUtility.categoryLocalization(category) }),
                buttons: [
                    {
                        action: "ok",
                        icon: "fas fa-check",
                        label: 'dsk.ok',
                        default: true,
                        callback: () => {
                            resolve(false);
                        },
                    },
                    {
                        action: "cancel",
                        icon: "fas fa-close",
                        label: 'dsk.cancel',
                        callback: () => {
                            resolve(true);
                        },
                    }
                ]
            });
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
            $(this.element).find('.dialog-buttons').html(`<div class="error"><p>${game.i18n.localize('dsk.DSKError.notUnderstood')}</p><ul><li>${this.errors.join("</li><li>")}</li></ul></div>`)
        }
    }
}