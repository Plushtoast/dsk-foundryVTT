import DSKUtility from "../system/dsk_utility.js"

export default class WizardDSK extends Application {
    constructor(app) {
        super(app)
        this.items = []
        this.actor = null
        this.errors = []
        this.dataTypes = []
        this.attributes = []
        this.updating = false
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.tabs = [{ navSelector: ".tabs", contentSelector: ".content", initial: "description" }]
        mergeObject(options, {
            classes: options.classes.concat(["dsk", "largeDialog"]),
            width: 770,
            height: 740,
        });
        options.resizable = true
        return options;
    }

    parseToItem(value, types) {
        if (value.trim() == "")
            return []

        return value.split(", ").map(x => {
            let parsed = DSKUtility.parseAbilityString(x.trim())
            let item = this.items.find(y => y.name == parsed.original && types.includes(y.type))
            if (!item) {
                item = this.items.find(y => y.name == parsed.name && types.includes(y.type))
            }
            if (!item) {
                if (this.attributes.includes(parsed.name)) {
                    let cost = 0

                    for (let i = this.actor.system.characteristics[game.dsk.config.knownShortcuts[parsed.name.toLowerCase()][1]].value + 1; i < parsed.step + 1; i++) {
                        cost += DSK.advancementCosts.E[i]
                    }
                    item = {
                        name: parsed.name,
                        step: parsed.step,
                        attributeRequirement: true,
                        system: {
                            APValue: {
                                value: cost
                            }
                        }
                    }
                } else {
                    console.warn(`Not found <${x}>`)
                    this.errors.push(`${types.map(x => game.i18n.localize(x)).join("/")}: ${x}`)
                    item = {
                        name: x.trim(),
                        notFound: true,
                        tooltip: game.i18n.localize('dsk.DSKError.itemNotFound'),
                        apCost: "?"
                    }
                }
            } else {
                item = duplicate(item)
                item.tooltip = game.i18n.localize("dsk.details")
                item = ItemRulesDSA5.reverseAdoptionCalculation(this.actor, parsed, item)
                if (item.system.APValue) {
                    item.APunparseable = isNaN(item.system.APValue.value)
                    item.apCost = item.APunparseable ? item.system.APValue.value : parsed.step * Number(item.system.APValue.value)
                }
            }
            item.replaceName = parsed.original
            item.step = parsed.step
            let actorHasItem = this.actor.items.find(y => types.includes(y.type) && y.name == parsed.original) != undefined
            item.disabled = actorHasItem || item.notFound || item.APunparseable
            if (actorHasItem)
                item.tooltip = game.i18n.localize("dsk.YouAlreadyHaveit")
            return item
        })
    }

    mergeLevels(itemsToAdd, item) {
        let merged = false
        let existing = itemsToAdd.find(x => x.name == item.name && x.type == item.type)
        if (existing) {
            merged = true
            const level = Number(getProperty(item, "system.step.value"))
            if (level) {
                existing.system.step.value += level
            }
        } else {
            itemsToAdd.push(item)
        }
        return merged
    }

    async addSelections(elems) {
        let itemsToAdd = []

        for (let k of elems) {
            const val = $(k).val()
            if (val == "") continue

            let item = duplicate(this.items.find(x => x.id == $(k).val()))
            let parsed = DSKUtility.parseAbilityString(item.name)
            item.name = $(k).attr("name")

            switch (item.type) {
                case "advantage":
                case "disadvantage":
                    item.system.step.value = Number($(k).attr("data-step"))
                    item = ItemRulesDSA5.reverseAdoptionCalculation(this.actor, parsed, item)

                    if (!this.mergeLevels(itemsToAdd, item)) AdvantageRulesDSA5.vantageAdded(this.actor, item)
                    break
                case "specialability":
                    item.system.step.value = Number($(k).attr("data-step"))

                    if ($(k).attr("data-free")) item.system.APValue.value = 0

                    item = ItemRulesDSA5.reverseAdoptionCalculation(this.actor, parsed, item)

                    if (!this.mergeLevels(itemsToAdd, item)) SpecialabilityRulesDSA5.abilityAdded(this.actor, item)
                    break
                case "magictrick":
                    this.mergeLevels(itemsToAdd, item)
                    break
            }
        }
        await this.actor.createEmbeddedDocuments("Item", itemsToAdd)
    }

    async alreadyAdded(string, category) {
        if (string == "") return false

        let result = false
        result = await new Promise((resolve, reject) => {
            new Dialog({
                title: game.i18n.localize("dsk.DIALOG.warning"),
                content: game.i18n.format('dsk.DIALOG.alreadyAddedCharacterpart', { category: game.i18n.localize(category) }),
                default: 'ok',
                buttons: {
                    ok: {
                        icon: '<i class="fas fa-check"></i>',
                        label: game.i18n.localize('dsk.Ok'),
                        default: true,
                        callback: () => {
                            resolve(false);
                        },
                    },
                    cancel: {
                        icon: '<i class="fas fa-close"></i>',
                        label: game.i18n.localize('dsk.Cancel'),
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

    async updateSkill(skills, itemType, factor = 1, bonus = true) {
        let itemsToUpdate = []
        for (let skill of skills) {
            let parsed = DSKUtility.parseAbilityString(skill.trim())
            let res = this.actor.items.find(i => { return i.type == itemType && i.name == parsed.name });
            if (res) {
                let skillUpdate = duplicate(res)
                skillUpdate.system.talentValue.value = Math.max(0, factor * parsed.step + (bonus ? Number(skillUpdate.system.talentValue.value) : 0))
                itemsToUpdate.push(skillUpdate)
            } else {
                console.warn(`Could not find ${itemType} ${skill}`)
                this.errors.push(`${game.i18n.localize(itemType)}: ${skill}`)
            }
        }
        await this.actor.updateEmbeddedDocuments("Item", itemsToUpdate);
    }

    async _loadCompendiae() {
        this.items = [];
        for (let p of game.packs) {
            if (p.documentName == "Item" && (game.user.isGM || !p.private)) {
                await p.getDocuments().then(content => {
                    this.items.push(...content.filter(x => this.dataTypes.includes(x.type)))
                })
            }
        }
        this.items.push(...game.items.contents.filter(i => i.permission > 1 && this.dataTypes.includes(i.type)));
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