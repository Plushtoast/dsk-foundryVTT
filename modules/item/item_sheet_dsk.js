import DSKStatusEffects from "../status/status_effects.js";
import DSKChatAutoCompletion from "../system/chat_autocompletion.js";
import DSK from "../system/config.js";
import DSKUtility from "../system/dsk_utility.js";
import SpecialabilityRulesDSK from "../system/specialability-rules.js";
import { svgAutoFit } from "../system/view_helper.js";
import { ItemSheetObfuscation } from "./obfuscatemixin.js";
import { itemFromDrop } from "../system/view_helper.js";
import { AppV2Mixin } from "../actor/mixins/appv2_mixin.js";
import { DragMixin } from "../actor/mixins/drag_mixin.js";
const { mergeObject, getProperty } = foundry.utils
const { renderTemplate } = foundry.applications.handlebars;
const { TextEditor } = foundry.applications.ux;

export default class ItemSheetDSK extends AppV2Mixin(DragMixin(foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ItemSheetV2))) {

    static setupSheets() {
        const sheetMappings = [
            { sheet: ItemSheetMeleeweapon, types: ["meleeweapon"] },
            { sheet: ItemSheetRangeweapon, types: ["rangeweapon"] },
            { sheet: ItemSheetArmor, types: ["armor"] },
            { sheet: ItemSheetAmmunition, types: ["ammunition"] },
            { sheet: ItemSheetEquipment, types: ["equipment"] },
            { sheet: ItemSheetSpecies, types: ["species"] },
            { sheet: ItemSheetCulture, types: ["culture"] },
            { sheet: ItemSheetProfession, types: ["profession"] },
            { sheet: ItemSheetAdvantage, types: ["advantage"] },
            { sheet: ItemSheetDisadvantage, types: ["disadvantage"] },
            { sheet: ItemSheetSpecialability, types: ["specialability"] },
            { sheet: ItemSheetAhnengeschenk, types: ["ahnengeschenk"] },
            { sheet: ItemSheetAhnengabe, types: ["ahnengabe"] },
            { sheet: ItemSheetPoison, types: ["poison"] },
            { sheet: ItemSheetSkill, types: ["skill"] },
            { sheet: ItemSheetCombatskill, types: ["combatskill"] },
            { sheet: ItemSheetInformation, types: ["information"] },
            { sheet: ItemSheetEffectwrapper, types: ["effectwrapper"] },
            { sheet: ItemSheetTrait, types: ["trait"] },
            { sheet: ItemSheetConsumable, types: ["consumable"] }
        ];

        foundry.documents.collections.Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);
        foundry.documents.collections.Items.registerSheet("dsk", ItemSheetDSK, { makeDefault: true });

        for (const { sheet, types } of sheetMappings) {
            foundry.documents.collections.Items.registerSheet("dsk", sheet, { makeDefault: true, types });
        }
        foundry.documents.collections.Items.unregisterSheet("dsk", ItemSheetDSK, { 
            types: sheetMappings.map(x => x.types).flat() 
        });
    }

    static TABS = {
        sheet: {
            tabs: [
                { id: 'description', label: 'description' },
                { id: 'details', label: 'details' },
                { id: 'effects', label: 'statuseffects' },
            ],
            initial: 'description',
            labelPrefix: 'dsk',
        },
    };

    static DEFAULT_OPTIONS = {
        position: {
            width: 450,
            height: 500,
        },
        form: {
            submitOnChange: true,
        },
        actions: {
            showItemHead: function () {
                this.item.postItem();
            },
            rolleffect: function () {
                this.setupEffect();
            },
            conditionShow: { handler: this.showCondition, buttons: [0, 2] },
        },
        ownerActions: {
            advanceStep: this.advanceWrapper,
            refundStep: this.advanceWrapper,
            statusAdd: function () {
                DSKStatusEffects.createCustomEffect(this.item, '', this.item.name);
            },
            conditionEdit: this.editCondition,
            conditionToggle: this.toggleCondition,
        },
        majorButtons: [
            {
                label: 'SHEET.RollEffect',
                icon: 'fas fa-dice-d20',
                action: 'rolleffect',
                visible: function () {
                    return this.hasRollEffect;
                },
            },
        ],
        window: {
            resizable: true,
            controls: [
                {
                    icon: 'fas fa-comment',
                    label: 'SHEET.PostItem',
                    action: 'showItemHead',
                },
            ],
        },
        classes: ['dsk', 'item', 'item-sheet'],
    };

    get title() {
        return this.item.name;
    }

    get hasRollEffect() {
        return false;
    }

    get dsaItemTemplate() {
        return `systems/dsk/templates/items/item-${this.item.type}-sheet.hbs`;
    }

    _configureRenderParts(options) {
        const parts = super._configureRenderParts(options);
        if (!parts.details) parts.details = { template: this.dsaItemTemplate, scrollable: [''] };
        return parts;
    }

    setupEffect(ev) {
        this.item.setupEffect().then(setupData => this.item.itemTest(setupData))
    }

    _processFormData(event, form, formData) {
        const data = formData.object;
        const overrides = foundry.utils.flattenObject(this.item.overrides || {});
        Object.keys(overrides).forEach((v) => delete data[v]);
        return foundry.utils.expandObject(data);
    }

    static async advanceWrapper(event, target) {
        if (this.wrapperLocked) return;

        const funct = target.dataset.action;

        this.wrapperLocked = true;
        const icon = target.tagName == 'i' ? $(target) : $(target).find('i');
        icon.addClass('fa-spin fa-spinner');
        if (await this[funct]()) return;

        this.wrapperLocked = false;
        icon.removeClass('fa-spin fa-spinner');
    }

    _advanceStep() { }
    _refundStep() { }

    static async showCondition(ev, target) {
        const id = target.dataset.id;
        if (ev.button == 0) {
            const effect = this.item.effects.get(id);
            effect.sheet.render(true);
        } else if (ev.button == 2) {
            this.item.deleteEmbeddedDocuments('ActiveEffect', [id]);
        }
    }

    static editCondition(ev, target) {
        const effect = this.item.effects.get(target.dataset.id);
        effect.sheet.render(true);
    }

    static toggleCondition(ev, target) {
        const condKey = $(target).parents('.statusEffect').attr('data-id');
        const ef = this.item.effects.get(condKey);
        ef.update({ disabled: !ef.disabled });
    }

    #lockOverrides(html) {
        const overrides = foundry.utils.flattenObject(this.item.overrides || {});
        Object.keys(overrides).forEach((v) => {
            const elem = html.find(`[name="${v}"]`);
            if (elem.length) {
                elem.prop('disabled', true);
                const icon = `<i class="fas fa-lock dsklocked" data-tooltip="dsk.TT.attributeLocked"></i>`;
                elem.after(icon);
            }
        });
    }

    async _onRender(context, options) {
        await super._onRender(context, options);
        const html = $(this.element);

        html.find('[data-action="editImage"]').on('mousedown', (ev) => {
            if (ev.button == 2) DSKUtility.showArtwork(this.item);
        });

        DSKChatAutoCompletion.bindRollCommands(html);
        DSKStatusEffects.bindButtons(html);

        this.#lockOverrides(html);

        const toObserve = html.find('header.item-header h1');
        if (toObserve.length) {
            const svg = toObserve.find('svg');
            if (svg.length) {
                const observer = new ResizeObserver(function (entries) {
                    svgAutoFit(svg, entries[0].contentRect.width);
                });
                observer.observe(toObserve.get(0));
                const input = toObserve.find('input');
                if (input.length && !input.get(0).disabled) {
                    svg.on('click', () => {
                        svg.hide();
                        input.show();
                        input.trigger('focus');
                    });
                    input.on('blur', () => {
                        svg.show();
                        input.hide();
                    });
                }
            }
        }
    }

    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        this.wrapperLocked = false;

        return {
            ...context,
            item: this.item,
            system: this.item.system,
            systemFields: this.document.system.schema?.fields,
            isOwned: !!this.item.actor,
            editable: this.isEditable,
            isGM: game.user.isGM,
            enrichedDescription: await TextEditor.enrichHTML(
                getProperty(this.item.system, "description.value"), 
                { secrets: this.item.isOwner }
            ),
            enrichedGmdescription: await TextEditor.enrichHTML(
                getProperty(this.item.system, "description.gminfo"), 
                { secrets: this.item.isOwner }
            ),
            conditions: DSKStatusEffects.prepareActiveEffects(this.item),
        };
    }

    async _onDrop(event) {
        super._onDrop(event);
        const dragData = JSON.parse(event.dataTransfer.getData('text/plain'));
        this._handleDrop(dragData);
    }

    async _handleDrop(dragData) {
        // Subclasses can override this
    }
}

class ItemSheetEffectwrapper extends ItemSheetDSK {

}

class ItemSheetTrait extends ItemSheetDSK {
    async _prepareContext(options) {
        const data = await super._prepareContext(options)
        mergeObject(data, {
            traitCategories: DSK.traitCategories,
            ranges: DSK.meleeRanges
        })
        return data
    }
}

class ItemSheetInformation extends ItemSheetDSK {
    async _prepareContext(options) {
        const data = await super._prepareContext(options)
        mergeObject(data, {
            allSkills: (await DSKUtility.allSkillsList(["skill"])).skills
        })
        return data
    }
}

class ItemSheetConsumable extends ItemSheetObfuscation(ItemSheetDSK) {
    async _prepareContext(options) {
        const data = await super._prepareContext(options)
        mergeObject(data, {
            calculatedPrice: game.dsk.config.ItemSubClasses.consumable.consumablePrice(this.item),
            qsOptions: Array.fromRange(3, 0).reduce((acc, x) => { acc[x] = game.i18n.localize(`dsk.consumable.qs.${x}`); return acc }, {}),
            consumableCategories: {
                "0": 'dsk.consumable.category.0'
            }
        })
        return data
    }
}

class ItemSheetMeleeweapon extends ItemSheetObfuscation(ItemSheetDSK){
    async _prepareContext(options) {
        const data = await super._prepareContext(options);
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
    async _prepareContext(options) {
        const data = await super._prepareContext(options)
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
    async _prepareContext(options) {
        const data = await super._prepareContext(options)
        mergeObject(data, {
            ammunitiongroups: DSK.ammunitiongroups
        })
        return data
    }
}

class ItemSheetEquipment extends ItemSheetObfuscation(ItemSheetDSK){
    _prepareTabs(group) {
        const tabs = super._prepareTabs(group);
        if (this.isBagWithContents()) {
            tabs.containerContent = {
                id: 'containerContent',
                group: 'sheet',
                icon: '',
                label: 'dsk.Equipment.bags',
                cssClass: ''
            };
        }
        return tabs;
    }

    async _prepareContext(options) {
        const data = await super._prepareContext(options);
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
        let elm = $(await renderTemplate('systems/dsk/templates/items/baghover.hbs', data))

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

    async _onRender(context, options) {
        await super._onRender(context, options);
        const html = $(this.element);
        const slots = html.find('.slot');
        
        slots.on('mouseenter', async(ev) => {
            const item = $(ev.currentTarget)
            let elm = await this.breakOverflow({
                name: item.attr('data-name'),
                weight: item.attr("data-weight"),
                quantity: item.attr("data-quantity")
            }, item)
            elm.fadeIn()
            item.on('mouseleave', () => {
                elm.remove()
                item.off('mouseleave')
            })
        })

        slots.on('mousedown', async(ev) => {
            let itemId = $(ev.currentTarget).attr("data-item-id")
            let item = this.actor.items.get(itemId);

            if (ev.button == 0)
                item.sheet.render(true);
            else if (ev.button == 2) {
                $('.itemInfo').remove()
                await item.update({ "system.parent_id": 0 });
                this.render({ force: true })
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
                this.render({ force: true })
                return
            }
        }

        await super._onDrop(event)
    }
}

class ItemSheetSpecies extends ItemSheetDSK{
    static DEFAULT_OPTIONS = {
        position: {
            width: 530,
            height: 570,
        },
    };

    async _prepareContext(options) {
        const data = await super._prepareContext(options);
        mergeObject(data, {
            hasLocalization: game.i18n.has(`dsk.Racedescr.${this.item.name}`)
        })
        return data
    }
}

class ItemSheetCulture extends ItemSheetDSK{
    static DEFAULT_OPTIONS = {
        position: {
            width: 700,
            height: 700,
        },
    };
}

class ItemSheetProfession extends ItemSheetDSK{
    static DEFAULT_OPTIONS = {
        position: {
            width: 700,
            height: 700,
        },
    };

    async _prepareContext(options) {
        const data = await super._prepareContext(options);
        mergeObject(data, {
            enrichedClothing: await TextEditor.enrichHTML(getProperty(this.item.system, "description.gear"), {secrets: this.item.isOwner })
        })
        return data
    }
}

class ItemSheetAdvantage extends ItemSheetDSK{
    async _prepareContext(options){
        const data = await super._prepareContext(options)
        data.enrichedRule = await TextEditor.enrichHTML(getProperty(this.item.system, "rule"), { secrets: this.item.isOwner })
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
    async _prepareContext(options) {
        const data = await super._prepareContext(options);
        mergeObject(data, {
            categories: DSK.specialAbilityCategories,
            subCategories: DSK.combatSkillSubCategories,
            enrichedRule: await TextEditor.enrichHTML(getProperty(this.item.system, "rule"), { secrets: this.item.isOwner }),
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
    get hasRollEffect() {
        return this.item.isOwned;
    }

    async _prepareContext(options) {
        const data = await super._prepareContext(options)
        data.canOnUseEffect = game.user.isGM || await game.settings.get("dsk", "playerCanEditSpellMacro")
        return data
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
    async _prepareContext(options) {
        const data = await super._prepareContext(options)
        mergeObject(data, {
            characteristics: DSK.characteristics,
            StFs: DSK.StFs,
            resistances: DSK.magicResistanceModifiers  
        })
        return data
    }
}

class ItemSheetPoison extends ItemSheetObfuscation(ItemSheetDSK){
    get hasRollEffect() {
        return true;
    }

    async _prepareContext(options) {
        const data = await super._prepareContext(options);
        mergeObject(data, {
            resistances: DSK.magicResistanceModifiers
        })
        return data
    }
}

class ItemSheetSkill extends ItemSheetDSK{
    async _prepareContext(options) {
        const data = await super._prepareContext(options)
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
    async _prepareContext(options) {
        const data = await super._prepareContext(options)
        mergeObject(data, {
            weapontypes: DSK.weapontypes,
            hasLocalization: game.i18n.has(`dsk.Combatskilldescr.${this.item.name}`),
        })
        return data
    }
}