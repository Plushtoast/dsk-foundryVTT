import DSKStatusEffects from "../status/status_effects.js";
import DSKChatAutoCompletion from "../system/chat_autocompletion.js";
import DSK from "../system/config.js";
import DSKUtility from "../system/dsk_utility.js";
import SpecialabilityRulesDSK from "../system/specialability-rules.js";
import { svgAutoFit } from "../system/view_helper.js";
import { ItemSheetObfuscation } from "./obfuscatemixin.js";
import { itemFromDrop } from "../system/view_helper.js";
const { mergeObject, getProperty } = foundry.utils

export default class ItemSheetDSK extends ItemSheet {
    static setupSheets(){
        Items.unregisterSheet("core", ItemSheet)

        Items.registerSheet("dsk", ItemSheetMeleeweapon, { makeDefault: true, types: ["meleeweapon"] });
        Items.registerSheet("dsk", ItemSheetRangeweapon, { makeDefault: true, types: ["rangeweapon"] });
        Items.registerSheet("dsk", ItemSheetArmor, { makeDefault: true, types: ["armor"] });
        Items.registerSheet("dsk", ItemSheetAmmunition, { makeDefault: true, types: ["ammunition"] });
        Items.registerSheet("dsk", ItemSheetEquipment, { makeDefault: true, types: ["equipment"] });
        Items.registerSheet("dsk", ItemSheetSpecies, { makeDefault: true, types: ["species"] });
        Items.registerSheet("dsk", ItemSheetCulture, { makeDefault: true, types: ["culture"] });
        Items.registerSheet("dsk", ItemSheetProfession, { makeDefault: true, types: ["profession"] });
        Items.registerSheet("dsk", ItemSheetAdvantage, { makeDefault: true, types: ["advantage"] });
        Items.registerSheet("dsk", ItemSheetDisadvantage, { makeDefault: true, types: ["disadvantage"] });
        Items.registerSheet("dsk", ItemSheetSpecialability, { makeDefault: true, types: ["specialability"] });
        Items.registerSheet("dsk", ItemSheetAhnengeschenk, { makeDefault: true, types: ["ahnengeschenk"] });
        Items.registerSheet("dsk", ItemSheetAhnengabe, { makeDefault: true, types: ["ahnengabe"] });
        Items.registerSheet("dsk", ItemSheetPoison, { makeDefault: true, types: ["poison"] });
        Items.registerSheet("dsk", ItemSheetSkill, { makeDefault: true, types: ["skill"] });
        Items.registerSheet("dsk", ItemSheetCombatskill, { makeDefault: true, types: ["combatskill"] });
        Items.registerSheet("dsk", ItemSheetInformation, { makeDefault: true, types: ["information"] });
        Items.registerSheet("dsk", ItemSheetEffectwrapper, { makeDefault: true, types: ["effectwrapper"] });
        Items.registerSheet("dsk", ItemSheetTrait, { makeDefault: true, types: ["trait"] });
        Items.registerSheet("dsk", ItemSheetConsumable, { makeDefault: true, types: ["consumable"] });
    }

    setupEffect(ev) {
        this.item.setupEffect().then(setupData => this.item.itemTest(setupData))
    }

    _getHeaderButtons() {
        let buttons = super._getHeaderButtons();
        buttons.unshift({
            class: "showItemHead",
            icon: `fas fa-comment`,
            onclick: async() => this.item.postItem()
        })
        return buttons
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.tabs = [{ navSelector: ".tabs", contentSelector: ".content" }]
        mergeObject(options, {
            classes: options.classes.concat(["dsk", "item"]),
            width: 450,
            height: 500,
        });
        return options;
    }

    get template() {
        return `systems/dsk/templates/items/item-${this.item.type}-sheet.html`;
    }

    async getData(options) {
        let data = super.getData(options).data;
        this.wrapperLocked = false
        mergeObject(data, {
            isOwned: this.item.actor,
            editable: this.isEditable,
            item: this.item,
            isGM: game.user.isGM,
            enrichedDescription: await TextEditor.enrichHTML(getProperty(this.item.system, "description.value"), {secrets: this.object.isOwner, async: true}),
            enrichedGmdescription: await TextEditor.enrichHTML(getProperty(this.item.system, "description.gminfo"), {secrets: this.object.isOwner, async: true})
        })
        DSKStatusEffects.prepareActiveEffects(this.item, data)
        return data
    }

    async advanceWrapper(ev, funct) {
        if(this.wrapperLocked) return

        this.wrapperLocked = true
        $(ev.currentTarget).find('i').addClass("fa-spin fa-spinner")        
        await this[funct]()
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find(".advance-step").mousedown(ev => this.advanceWrapper(ev, "_advanceStep"))
        html.find(".refund-step").mousedown(ev => this.advanceWrapper(ev, "_refundStep"))

        html.find('[data-edit="img"]').mousedown(ev => {
            if (ev.button == 2) DSKUtility.showArtwork(this.item)
        })

        html.find(".status-add").click(() => {
            DSKStatusEffects.createCustomEffect(this.item, "", this.item.name)            
        })

        html.find('.condition-show').mousedown(ev => {
            ev.preventDefault()
            const id = $(ev.currentTarget).attr("data-id")
            if (ev.button == 0) {
                const effect = this.item.effects.get(id)
                effect.sheet.render(true)
            } else if (ev.button == 2) {
                this.item.deleteEmbeddedDocuments("ActiveEffect", [id])
            }
        })

        html.find(".condition-toggle").mousedown(ev => {
            let condKey = $(ev.currentTarget).parents(".statusEffect").attr("data-id")
            let ef = this.item.effects.get(condKey)
            ef.update({ disabled: !ef.disabled })
        })

        html.find('.condition-edit').click(ev => {
            const effect = this.item.effects.get($(ev.currentTarget).attr("data-id"))
            effect.sheet.render(true)
        })

        DSKChatAutoCompletion.bindRollCommands(html)
        DSKStatusEffects.bindButtons(html)

        let toObserve = html.find(".item-header")
        if (toObserve.length) {
            let svg = toObserve.find('svg')
            if (svg) {
                let observer = new ResizeObserver(function(entries) {
                    let entry = entries[0]
                    svgAutoFit(svg, entry.contentRect.width)
                });
                observer.observe(toObserve.get(0));
                let input = toObserve.find('input')
                if (!input.get(0).disabled) {
                    svg.click(() => {
                        svg.hide()
                        input.show()
                        input.focus()
                    })
                    input.blur(function() {
                        svg.show()
                        input.hide()
                    })
                }
            }
        }
    }
}

class ItemSheetEffectwrapper extends ItemSheetDSK {

}

class ItemSheetTrait extends ItemSheetDSK {
    async getData(options) {
        const data = await super.getData(options)
        mergeObject(data, {
            traitCategories: DSK.traitCategories,
            ranges: DSK.meleeRanges
        })
        return data
    }
}

class ItemSheetInformation extends ItemSheetDSK {
    async getData(options) {
        const data = await super.getData(options)
        mergeObject(data, {
            allSkills: (await DSKUtility.allSkillsList(["skill"])).skills
        })
        return data
    }
}

class ItemSheetConsumable extends ItemSheetObfuscation(ItemSheetDSK) {
    async getData(options) {
        const data = await super.getData(options)
        mergeObject(data, {
            calculatedPrice: game.dsk.config.ItemSubClasses.consumable.consumablePrice(this.item),
            qsOptions: Array.fromRange(3, 0).reduce((acc, x) => { acc[x] = game.i18n.localize(`dsk.consumable.qs.${x}`); return acc }, {}),
            consumableCategories: {
                "0": 'dsk.consumable.category.0',
                "1": 'dsk.consumable.category.1'
            }
        })
        return data
    }
}

class ItemSheetMeleeweapon extends ItemSheetObfuscation(ItemSheetDSK){
    async getData(options) {
        const data = await super.getData(options);
        let twoHanded = false
        let wrongGripHint = ""
        if (!twoHanded) {
            wrongGripHint = "wrongGrip.yieldTwo"
        } else {
            const localizedCT = game.i18n.localize(`dsk.LocalizedCTs.${this.item.system.combatskill}`)
            switch (localizedCT) {
                case "Two-Handed Impact Weapons":
                case "Two-Handed Swords":
                    const reg = new RegExp(game.i18n.localize('dsk.wrongGrip.wrongGripBastardRegex'))
                    if (reg.test(this.item.name))
                        wrongGripHint = "wrongGrip.yieldOneBastard"
                    else
                        wrongGripHint = "wrongGrip.yieldOneSwordBlunt"

                    break
                default:
                    wrongGripHint = "wrongGrip.yieldOnePolearms"
            }
        }
        mergeObject(data, {
            twoHanded,
            wrongGripLabel: twoHanded ? "wrongGrip.oneHanded" : "wrongGrip.twoHanded",
            wrongGripHint,
            isShield: this.item.system.combatskill == game.i18n.localize("dsk.LocalizedIDs.Shields"),
            combatskills: (await DSKUtility.allSkillsList(["combatskill"])).meleeSkills,
            ranges: DSK.meleeRanges,
            shieldSizes: DSK.shieldSizes
        })
        if (this.item.actor) {
            const combatSkill = this.item.actor.items.find(x => x.type == "combatskill" && x.name == this.item.system.combatskill)
            data['canBeOffHand'] = combatSkill && !(combatSkill.system.weapontype.twoHanded) && this.item.system.worn.value
            data['canBeWrongGrip'] = !["Daggers", "Fencing Weapons"].includes(game.i18n.localize(`dsk.LocalizedCTs.${this.item.system.combatskill}`))
        }
        data.canOnUseEffect = game.user.isGM || await game.settings.get("dsk", "playerCanEditSpellMacro")
        return data
    }
}

class ItemSheetRangeweapon extends ItemSheetObfuscation(ItemSheetDSK){
    async getData(options) {
        const data = await super.getData(options)
        mergeObject(data, {
            canOnUseEffect: game.user.isGM || await game.settings.get("dsk", "playerCanEditSpellMacro"),
            ammunitiongroups: DSK.ammunitiongroups,
            combatskills: (await DSKUtility.allSkillsList(["combatskill"])).rangeSkills
        })
        return data
    }
}

class ItemSheetArmor extends ItemSheetObfuscation(ItemSheetDSK){

}

class ItemSheetAmmunition extends ItemSheetObfuscation(ItemSheetDSK){
    async getData(options) {
        const data = await super.getData(options)
        mergeObject(data, {
            ammunitiongroups: DSK.ammunitiongroups
        })
        return data
    }
}

class ItemSheetEquipment extends ItemSheetObfuscation(ItemSheetDSK){
    async getData(options) {
        const data = await super.getData(options);
        mergeObject(data, {
            equipmentTypes: DSK.equipmentTypes,
            canOnUseEffect: game.user.isGM || await game.settings.get("dsk", "playerCanEditSpellMacro")
        })
        if (this.isBagWithContents()) {
            let weightSum = 0
            mergeObject(data, {
                containerContent: this.item.actor.items
                .filter(x => DSK.equipmentCategories.includes(x.type) && x.system.parent_id == this.item.id)
                .map(x => {
                    x.weight = parseFloat((x.system.weight * x.system.quantity).toFixed(3));
                    weightSum += Number(x.weight)
                    return x
                }),
                weightSum: parseFloat(weightSum.toFixed(3)),
                weightWidth: `style="width: ${Math.min(this.item.system.capacity ? weightSum / this.item.system.capacity * 100 : 0, 100)}%"`,
                weightExceeded: weightSum > Number(this.item.system.capacity) ? "exceeded" : ""
            })
        }
        return data
    }

    async breakOverflow(data, parent) {
        let elm = $(await renderTemplate('systems/dsk/templates/items/baghover.html', data))

        let top = parent.offset().top + 52;
        let left = parent.offset().left - 75;
        elm.appendTo($('body'));
        elm.css({
            position: 'absolute',
            left: left + 'px',
            top: top + 'px',
            bottom: 'auto',
            right: 'auto',
            'z-index': 10000
        });
        return elm
    }

    activateListeners(html) {
        super.activateListeners(html)
        const slots = html.find('.slot')
        slots.mouseenter(async(ev) => {
            const item = $(ev.currentTarget)
            let elm = await this.breakOverflow({
                name: item.attr('data-name'),
                weight: item.attr("data-weight"),
                quantity: item.attr("data-quantity")
            }, item)
            elm.fadeIn()
            item.mouseleave(() => {
                elm.remove()
                item.off('mouseleave')
            })
        })

        slots.mousedown(async(ev) => {
            let itemId = $(ev.currentTarget).attr("data-item-id")
            let item = this.actor.items.get(itemId);

            if (ev.button == 0)
                item.sheet.render(true);
            else if (ev.button == 2) {
                $('.itemInfo').remove()
                await item.update({ "system.parent_id": 0 });
                this.render(true)
            }
        })
    }

    isBagWithContents() {
        return this.item.actor && getProperty(this.item, "system.category") == "bags"
    }

    async _onDrop(event) {
        if (this.isBagWithContents()) {
            const dragData = JSON.parse(event.dataTransfer.getData("text/plain"))
            const { item, typeClass, selfTarget } = await itemFromDrop(dragData, undefined)
            const selfItem = this.item.id == item.id
            const ownItem = this.item.parent.id == dragData.actorId

            if (DSK.equipmentCategories.includes(typeClass) && !selfItem) {
                item.system.parent_id = this.item.id
                if (item.system.worn && item.system.worn.value)
                    item.system.worn.value = false

                if (ownItem) {
                    await this.item.actor.updateEmbeddedDocuments("Item", [item])
                } else {
                    await this.item.actor.sheet._addLoot(item)
                }
                this.render(true)
                return
            }
        }

        await super._onDrop(event)
    }
}

class ItemSheetSpecies extends ItemSheetDSK{
    static get defaultOptions() {
        const options = super.defaultOptions;
        mergeObject(options, {
            width: 530,
            height: 570,
        });
        return options;
    }

    async getData(options) {
        const data = await super.getData(options);
        mergeObject(data, {
            hasLocalization: game.i18n.has(`dsk.Racedescr.${this.item.name}`)
        })
        return data
    }
}

class ItemSheetCulture extends ItemSheetDSK{
    static get defaultOptions() {
        const options = super.defaultOptions;
        mergeObject(options, {
            width: 700,
            height: 700,
        });
        return options;
    }
}

class ItemSheetProfession extends ItemSheetDSK{
    static get defaultOptions() {
        const options = super.defaultOptions;
        mergeObject(options, {
            width: 700,
            height: 700,
        });
        return options;
    }

    async getData(options) {
        const data = await super.getData(options);
        mergeObject(data, {
            enrichedClothing: await TextEditor.enrichHTML(getProperty(this.item.system, "description.gear"), {secrets: this.object.isOwner, async: true})
        })
        return data
    }
}

class ItemSheetAdvantage extends ItemSheetDSK{
    async getData(options){
        const data = await super.getData(options)
        data.enrichedRule = await TextEditor.enrichHTML(getProperty(this.item.system, "rule"), { secrets: this.object.isOwner, async: true })
        return data
    }

    _advancable() {
        return this.item.system.max > 0
    }

    async _refundStep() {
        let xpCost, steps
        if (this.item.system.level > 1) {
            xpCost = this.item.system.ap
            if (/;/.test(xpCost)) {
                steps = xpCost.split(";").map(x => Number(x.trim()))
                xpCost = steps[this.item.system.level - 1]
            }
            await this.item.actor._updateAPs(xpCost * -1, {}, { render: false })
            await this.item.update({ "system.level": this.item.system.level - 1 })
        }
    }

    async _advanceStep() {
        let xpCost, steps
        if (this.item.system.level < this.item.system.max) {
            xpCost = this.item.system.ap
            if (/;/.test(xpCost)) {
                steps = xpCost.split(";").map(x => Number(x.trim()))
                xpCost = steps[this.item.system.level]
            }
            if (await this.item.actor.checkEnoughXP(xpCost)) {
                await this.item.actor._updateAPs(xpCost, {}, { render: false })
                await this.item.update({ "system.level": this.item.system.level + 1 })
            }
        }
    }

}

class ItemSheetDisadvantage extends ItemSheetAdvantage{

}

class ItemSheetSpecialability extends ItemSheetDSK{
    async getData(options) {
        const data = await super.getData(options);
        mergeObject(data, {
            categories: DSK.specialAbilityCategories,
            subCategories: DSK.combatSkillSubCategories,
            enrichedRule: await TextEditor.enrichHTML(getProperty(this.item.system, "rule"), { secrets: this.object.isOwner, async: true }),
            canOnUseEffect: game.user.isGM || await game.settings.get("dsk", "playerCanEditSpellMacro")
        })
        return data
    }

    async _refundStep() {
        let xpCost, steps
        if (this.item.system.level > 1) {
            xpCost = this.item.system.ap
            if (/;/.test(xpCost)) {
                steps = xpCost.split(";").map(x => Number(x.trim()))
                xpCost = steps[this.item.system.level - 1]
            }
            await this.item.actor._updateAPs(xpCost * -1, {}, { render: false })
            await this.item.update({ "system.level": this.item.system.level - 1 })
        }
    }

    async _advanceStep() {
        let xpCost, steps
        if (this.item.system.level < this.item.system.max) {
            xpCost = this.item.system.ap
            if (/;/.test(xpCost)) {
                steps = xpCost.split(";").map(x => Number(x.trim()))
                xpCost = steps[this.item.system.level]
            }
            if (await this.item.actor.checkEnoughXP(xpCost)) {
                await this.item.actor._updateAPs(xpCost, {}, { render: false })
                await this.item.update({ "system.level": this.item.system.level + 1 })
            }
        }
    }

    _advancable() {
        return this.item.system.max > 0
    }
}

class ItemSheetAhnengeschenk extends ItemSheetDSK{
    async getData(options) {
        const data = await super.getData(options)
        data.canOnUseEffect = game.user.isGM || await game.settings.get("dsk", "playerCanEditSpellMacro")
        return data
    }
    _getHeaderButtons() {
        let buttons = super._getHeaderButtons();
        if (this.item.isOwned) {
            buttons.unshift({
                class: "rolleffect",
                icon: `fas fa-dice-d20`,
                onclick: async ev => this.setupEffect(ev)
            })
        }
        return buttons
    }
    async setupEffect(ev) {
        if (this.item.actor.system.stats.AeP.value < 1)
            return ui.notifications.error("dsk.DSKError.NotEnoughAeP", { localize: true })

        const cantrip = game.dsk.config.ItemSubClasses.ahnengeschenk
        await this.item.actor.update({ "system.stats.AeP.value": this.item.actor.system.stats.AeP.value -= 1 })
        const chatMessage = `<p><b>${this.item.name} - ${game.i18n.localize('TYPES.Item.ahnengeschenk')} ${game.i18n.localize('dsk.probe')}</b></p><p>${this.item.system.description.value}</p><p>${cantrip.chatData(this.item.system, "").join("</br>")}</p>`
        await ChatMessage.create(DSKUtility.chatDataSetup(chatMessage));
    }
}

class ItemSheetAhnengabe extends ItemSheetDSK{
    async getData(options) {
        const data = await super.getData(options)
        mergeObject(data, {
            characteristics: DSK.characteristics,
            StFs: DSK.StFs,
            resistances: DSK.magicResistanceModifiers  
        })
        return data
    }
}

class ItemSheetPoison extends ItemSheetObfuscation(ItemSheetDSK){
    async getData(options) {
        const data = await super.getData(options);
        mergeObject(data, {
            resistances: DSK.magicResistanceModifiers
        })
        return data
    }

    _getHeaderButtons() {
        let buttons = super._getHeaderButtons();
        buttons.unshift({
            class: "rolleffect",
            icon: `fas fa-dice-d20`,
            onclick: async ev => this.setupEffect(ev)
        })
        return buttons
    }
}

class ItemSheetSkill extends ItemSheetDSK{
    async getData(options) {
        const data = await super.getData(options)
        mergeObject(data, {
            characteristics: DSK.characteristics,
            skillGroups: DSK.skillGroups,
            skillBurdens: DSK.skillBurdens,
            hasLocalization: game.i18n.has(`dsk.SKILLdescr.${this.item.name}`),
            StFs: DSK.StFs   
        })
        return data
    }
}

class ItemSheetCombatskill extends ItemSheetSkill{
    async getData(options) {
        const data = await super.getData(options)
        mergeObject(data, {
            weapontypes: DSK.weapontypes,
            hasLocalization: game.i18n.has(`dsk.Combatskilldescr.${this.item.name}`),
        })
        return data
    }
}