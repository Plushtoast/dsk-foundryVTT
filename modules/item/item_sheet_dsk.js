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
                { id: 'description', label: 'dsk.description' },
                { id: 'details', label: 'dsk.details' },
                { id: 'effects', label: 'dsk.statuseffects' },
            ],
            initial: 'description',
        },
    };

    static PARTS = {
        header: {
            template: 'systems/dsk/templates/items/item-header.hbs',
        },
        stat: {
            template: 'systems/dsk/templates/items/item-stat.hbs',
        },
        tabs: {
            template: 'systems/dsk/templates/system/dsktabs.hbs',
            id: "tabs",
        },
        description: {
            template: 'systems/dsk/templates/items/item-description.hbs',
            scrollable: [''],
        },
        details: {
            template: 'systems/dsk/templates/items/item-equipment-sheet.hbs',
            scrollable: [''],
        },
        effects: {
            template: 'systems/dsk/templates/items/item-effects.hbs',
            scrollable: [''],
        },
    }

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
                label: 'dsk.SHEET.RollEffect',
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
                    label: 'dsk.SHEET.PostItem',
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
        // Override the details template with the item-specific template
        if (parts.details) {
            parts.details.template = this.dsaItemTemplate;
        }
        return parts;
    }

    async _preparePartContext(partId, context) {
        const partContext = await super._preparePartContext(partId, context);
        if (partId in partContext.tabs) partContext.tab = partContext.tabs[partId];
        return partContext;
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
            ...DSKStatusEffects.prepareActiveEffects(this.item),
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

// Base class for equipment-based items (with price, weight, quantity)
class EffectsEquipmentSheet extends ItemSheetDSK {
    static PARTS = {
        header: {
            template: 'systems/dsk/templates/items/item-header.hbs',
        },
        stat: {
            template: 'systems/dsk/templates/items/item-equipment.hbs',
        },
        tabs: {
            template: 'systems/dsk/templates/system/dsktabs.hbs',
            id: "tabs",
        },
        description: {
            template: 'systems/dsk/templates/items/item-description.hbs',
            scrollable: [''],
        },
        details: {
            template: 'systems/dsk/templates/items/item-equipment-sheet.hbs',
            scrollable: [''],
        },
        effects: {
            template: 'systems/dsk/templates/items/item-effects.hbs',
            scrollable: [''],
        },
    }
}

// Base class for stat-based items without effects (like skill, ahnengeschenk)
class NoEffectsSheet extends ItemSheetDSK {
    _prepareTabs(group) {
        const tabs = super._prepareTabs(group);
        delete tabs.effects;
        return tabs;
    }
}

// Base class for localizable skills (skill, combatskill)
class LocalizerSheet extends ItemSheetDSK {
    static PARTS = {
        header: {
            template: 'systems/dsk/templates/items/item-header.hbs',
        },
        stat: {
            template: 'systems/dsk/templates/items/item-stat.hbs',
        },
        tabs: {
            template: 'systems/dsk/templates/system/dsktabs.hbs',
            id: "tabs",
        },
        description: {
            template: 'systems/dsk/templates/items/item-localizerdescription.hbs',
            scrollable: [''],
        },
        details: {
            template: 'systems/dsk/templates/items/item-skill-sheet.hbs',
            scrollable: [''],
        },
    }

    _prepareTabs(group) {
        const tabs = super._prepareTabs(group);
        delete tabs.effects;
        return tabs;
    }
}

// Base class for career items (species, culture, profession)
class CareerSheet extends NoEffectsSheet {
    static PARTS = {
        header: {
            template: 'systems/dsk/templates/items/item-header.hbs',
        },
        stat: {
            template: 'systems/dsk/templates/items/item-career-stat.hbs',
        },
        tabs: {
            template: 'systems/dsk/templates/system/dsktabs.hbs',
            id: "tabs",
        },
        description: {
            template: 'systems/dsk/templates/items/item-description.hbs',
            scrollable: [''],
        },
        details: {
            template: 'systems/dsk/templates/items/item-species-sheet.hbs',
            scrollable: [''],
        },
    }
}

class ItemSheetEffectwrapper extends ItemSheetDSK {
    _prepareTabs(group) {
        const tabs = super._prepareTabs(group);
        delete tabs.details;
        return tabs;
    }
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

class ItemSheetInformation extends NoEffectsSheet {
    static TABS = {
        sheet: {
            tabs: [
                { id: 'details', label: 'dsk.details' },
            ],
            initial: 'details',
        },
    };

    static PARTS = {
        header: {
            template: 'systems/dsk/templates/items/item-header.hbs',
        },
        stat: {
            template: 'systems/dsk/templates/items/item-stat.hbs',
        },
        tabs: {
            template: 'systems/dsk/templates/system/dsktabs.hbs',
            id: "tabs",
        },
        details: {
            template: 'systems/dsk/templates/items/item-information-sheet.hbs',
            scrollable: [''],
        },
    }

    async _prepareContext(options) {
        const data = await super._prepareContext(options)
        mergeObject(data, {
            allSkills: (await DSKUtility.allSkillsList(["skill"])).skills
        })
        return data
    }
}

class ItemSheetConsumable extends ItemSheetObfuscation(EffectsEquipmentSheet) {
    static PARTS = {
        header: {
            template: 'systems/dsk/templates/items/item-header.hbs',
        },
        stat: {
            template: 'systems/dsk/templates/items/item-consumable-equipment.hbs',
        },
        tabs: {
            template: 'systems/dsk/templates/system/dsktabs.hbs',
            id: "tabs",
        },
        description: {
            template: 'systems/dsk/templates/items/item-description.hbs',
            scrollable: [''],
        },
        details: {
            template: 'systems/dsk/templates/items/item-consumable-sheet.hbs',
            scrollable: [''],
        },
        effects: {
            template: 'systems/dsk/templates/items/item-effects.hbs',
            scrollable: [''],
        },
    }

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

class ItemSheetMeleeweapon extends ItemSheetObfuscation(EffectsEquipmentSheet){
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

class ItemSheetRangeweapon extends ItemSheetObfuscation(EffectsEquipmentSheet){
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

class ItemSheetArmor extends ItemSheetObfuscation(EffectsEquipmentSheet){

}

class ItemSheetAmmunition extends ItemSheetObfuscation(EffectsEquipmentSheet){
    async _prepareContext(options) {
        const data = await super._prepareContext(options)
        mergeObject(data, {
            ammunitiongroups: DSK.ammunitiongroups
        })
        return data
    }
}

class ItemSheetEquipment extends ItemSheetObfuscation(EffectsEquipmentSheet){
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

class ItemSheetSpecies extends CareerSheet {
    static DEFAULT_OPTIONS = {
        position: {
            width: 530,
            height: 570,
        },
    };

    static PARTS = {
        ...CareerSheet.PARTS,
        description: {
            template: 'systems/dsk/templates/items/item-species-description.hbs',
            scrollable: [''],
        },
        details: {
            template: 'systems/dsk/templates/items/item-species-sheet.hbs',
            scrollable: [''],
        },
    }

    async _prepareContext(options) {
        const data = await super._prepareContext(options);
        mergeObject(data, {
            hasLocalization: game.i18n.has(`dsk.Racedescr.${this.item.name}`)
        })
        return data
    }
}

class ItemSheetCulture extends CareerSheet {
    static DEFAULT_OPTIONS = {
        position: {
            width: 700,
            height: 700,
        },
    };

    static PARTS = {
        ...CareerSheet.PARTS,
        description: {
            template: 'systems/dsk/templates/items/item-culture-description.hbs',
            scrollable: [''],
        },
        details: {
            template: 'systems/dsk/templates/items/item-culture-sheet.hbs',
            scrollable: [''],
        },
    }
}

class ItemSheetProfession extends CareerSheet {
    static DEFAULT_OPTIONS = {
        position: {
            width: 700,
            height: 700,
        },
    };

    static PARTS = {
        ...CareerSheet.PARTS,
        description: {
            template: 'systems/dsk/templates/items/item-profession-description.hbs',
            scrollable: [''],
        },
        details: {
            template: 'systems/dsk/templates/items/item-profession-sheet.hbs',
            scrollable: [''],
        },
    }

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

class ItemSheetAhnengeschenk extends NoEffectsSheet {
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

class ItemSheetPoison extends ItemSheetObfuscation(EffectsEquipmentSheet){
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

class ItemSheetSkill extends LocalizerSheet {
    async _prepareContext(options) {
        const data = await super._prepareContext(options)
        mergeObject(data, {
            characteristics: DSK.characteristics,
            skillGroups: DSK.skillGroups,
            skillBurdens: DSK.skillBurdens,
            hasLocalization: game.i18n.has(`dsk.SKILLdescr.${this.item.name}`),
            localizerPrefix: 'dsk.SKILLdescr.',
            StFs: DSK.StFs   
        })
        return data
    }
}

class ItemSheetCombatskill extends LocalizerSheet {
    static PARTS = {
        ...LocalizerSheet.PARTS,
        details: {
            template: 'systems/dsk/templates/items/item-combatskill-sheet.hbs',
            scrollable: [''],
        },
        effects: {
            template: 'systems/dsk/templates/items/item-effects.hbs',
            scrollable: [''],
        },
    }

    _prepareTabs(group) {
        // Combatskill has effects tab, so don't delete it
        const tabs = ItemSheetDSK.prototype._prepareTabs.call(this, group);
        return tabs;
    }

    async _prepareContext(options) {
        const data = await super._prepareContext(options)
        mergeObject(data, {
            characteristics: DSK.characteristics,
            skillGroups: DSK.skillGroups,
            skillBurdens: DSK.skillBurdens,
            weapontypes: DSK.weapontypes,
            hasLocalization: game.i18n.has(`dsk.Combatskilldescr.${this.item.name}`),
            localizerPrefix: 'dsk.Combatskilldescr.',
            StFs: DSK.StFs
        })
        return data
    }
}