import DialogActorConfig from "../dialog/dialog-actorConfig.js";
import { bindImgToCanvasDragStart } from "../hooks/imgTileDrop.js";
import ItemDSK from "../item/item_dsk.js";
import DSKStatusEffects from "../status/status_effects.js";
import DSKChatAutoCompletion from "../system/chat_autocompletion.js";
import DSKChatListeners from "../system/chat_listeners.js";
import DSK from "../system/config.js";
import DSKSoundEffect from "../system/dsk-soundeffect.js";
import DSKUtility from "../system/dsk_utility.js";
import RuleChaos from "../system/rule_chaos.js";
import AdvantageRulesDSK from "../system/advantage-rules.js"
import SpecialabilityRulesDSK from "../system/specialability-rules.js"
import ActorDSK from "./actor_dsk.js";
import { itemFromDrop } from "../system/view_helper.js";
import { AppV2Mixin } from "./mixins/appv2_mixin.js";
import OnUseEffect from "../system/onUseEffects.js";
const { mergeObject, getProperty, duplicate } = foundry.utils
const { renderTemplate } = foundry.applications.handlebars;
const { TextEditor } = foundry.applications.ux;

export default class ActorSheetDSK extends AppV2Mixin(foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2)) {

    static TABS = {
        sheet: {
            tabs: [
                { id: 'skills', label: 'dsk.skills' },
                { id: 'combat', label: 'dsk.Combat' },
                { id: 'main', label: 'dsk.attributes' },
                { id: 'inventory', label: 'TYPES.Item.equipment' },
                { id: 'status', label: 'dsk.status' },
                { id: 'notes', label: 'dsk.Notes' },
            ],
            initial: 'skills',
        },
    };

    static DEFAULT_OPTIONS = {
        position: {
            width: 770,
            height: 740,
        },
        classes: ['dsk', 'actor'],
        actions: {
            itemCreate: this._onItemCreate,
            playerview: this._togglePlayerview,
            actorConfig: this._configActor,
            library: this._openLibrary,
            locksheet: this._changeAdvanceLock,
            skillSelect: { handler: this._skillSelect, buttons: [0, 2] },
            conditionEdit: this._conditionEdit,
            chCollapse: this._chCollapse,
            statusCreate: this._statusCreate,
            itemDropdown: this._itemDropdown,
            itemEdit: this._itemEdit,
            chValue: this._chValue,
            itemContextMenu: this._itemContextMenu,
            filterTalents: this._filterTalents,
            chRegenerate: this._chRegenerate,
            chWeaponless: this._chWeaponless,
            chFallingDamage: this._chFallingDamage,
            chRollCombat: this._chRollCombat,
            conditionShow: { handler: this._conditionShow, buttons: [0, 2] },
            spellSelect: { handler: this._spellSelect, buttons: [0, 2] },
        },
        ownerActions: {
            schipUpdate: this._schipUpdate,
            deleteItem: this._deleteItemAction,
            loadWeapon: { handler: this._loadWeapon, buttons: [0, 2] },
            itemSwapMag: this._itemSwapMag,
            itemToggle: this._itemToggle,
            swapWeaponHand: this._swapWeaponHand,
            statusAdd: { handler: this._statusAdd, buttons: [0, 2] },
            disableRegeneration: this._disableRegeneration,
            conditionValue: { handler: this._conditionValue, buttons: [0, 2] },
            conditionToggle: this._conditionToggle,
            advanceWrapper: this._advanceWrapper,
            onUseItem: { handler: this._onMacroUseItem, buttons: [0, 2] },
            quantityClick: { handler: this._quantityClick, buttons: [0, 2] },
            consumeItem: { handler: this._consumeItem, buttons: [2] },
            itemPost: this._itemPost,
        },
        form: {
            submitOnChange: true,
        },
        majorButtons: [
            {
                action: 'playerview',
                icon: function () {
                    return `fas fa-toggle-${this.actor.system.playerView ? 'on' : 'off'}`;
                },
                label: 'dsk.SHEET.switchLimited',
                visible: function () {
                    return game.user.isGM;
                },
            },
            {
                action: 'locksheet',
                label: 'dsk.SHEET.Lock',
                icon: function () {
                    return `fas fa-${this.actor.system.sheetLocked ? '' : 'un'}lock`;
                },
                visible: function () {
                    return this.actor.system.canAdvance;
                },
            },
        ],
        window: {
            resizable: true,
            contentClasses: ['standard-form'],
            controls: [
                {
                    action: 'actorConfig',
                    label: 'dsk.SHEET.actorConfig',
                    icon: 'fas fa-link',
                    visible: function () {
                        return this.actor.isOwner;
                    },
                },
                {
                    action: 'library',
                    label: 'dsk.SHEET.Library',
                    icon: 'fas fa-university',
                },
            ],
        },
    };

    get title() {
        return this.actor.name;
    }

    async render(options = {}, _options = {}) {
        this._saveSearchFields();
        this._saveCollapsed();
        const result = await super.render(options, _options);
        this._setCollapsed();
        this._restoreSearchFields();

        if (this.currentFocus) {
            $(this.element)
                .find('[data-item-id="' + this.currentFocus + '"] input')
                .trigger('focus')
                .trigger('select');
            this.currentFocus = null;
        }
        return result;
    }

    // Static action handlers
    static async _togglePlayerview(ev, target) {
        await this.actor.update({ "system.playerView": !this.actor.system.playerView });
    }

    static async _configActor(ev, target) {
        DialogActorConfig.buildDialog(this.actor);
    }

    static async _openLibrary(ev, target) {
        game.dsk.itemLibrary.render(true);
    }

    static async _changeAdvanceLock(ev, target) {
        await this.actor.update({ "system.sheetLocked": !this.actor.system.sheetLocked });
    }

    static async _skillSelect(ev, target) {
        const itemId = this._getItemId(target);
        const skill = this.actor.items.get(itemId);

        if (ev.button == 0) {
            const setupData = await this.actor.setupSkill(skill, {}, this.getTokenId());
            this.actor.basicTest(setupData);
        } else if (ev.button == 2) {
            skill.sheet.render(true);
        }
    }

    static async _spellSelect(ev, target) {
        const itemId = this._getItemId(target);
        const skill = this.actor.items.get(itemId);

        if (ev.button == 0) {
            const setupData = await this.actor.setupSpell(skill, {}, this.getTokenId());
            this.actor.basicTest(setupData);
        } else if (ev.button == 2) {
            skill.sheet.render(true);
        }
    }

    static async _conditionEdit(ev, target) {
        const effect = target.dataset.uuid 
            ? (await fromUuid(target.dataset.uuid)) 
            : this.actor.effects.get(target.dataset.id);
        effect.sheet.render(true);
    }

    static _chCollapse(ev, target) {
        const icon = target.querySelector('i');
        icon?.classList.toggle("fa-angle-up");
        icon?.classList.toggle("fa-angle-down");
        $(target).closest(".groupbox").find('.row-section:nth-child(2)').fadeToggle();
    }

    static _statusCreate(ev, target) {
        const menu = $(target).closest(".statusEffectMenu").find('ul');
        menu.fadeIn('fast', () => { menu.find('input').focus(); });
    }

    static _itemDropdown(ev, target) {
        ev.preventDefault();
        $(target).closest('.item').find('.expandDetails:first').toggleClass('shown');
    }

    static _itemEdit(ev, target) {
        ev.preventDefault();
        const itemId = this._getItemId(target);
        const item = this.actor.items.get(itemId);
        item.sheet.render(true);
    }

    static async _chValue(ev, target) {
        ev.preventDefault();
        const characteristic = target.dataset.char;
        const setupData = await this.actor.setupCharacteristic(characteristic, {}, this.getTokenId());
        this.actor.basicTest(setupData);
    }

    static _itemContextMenu(ev, target) {
        ev.preventDefault();
        ev.stopPropagation();
        const { clientX, clientY } = ev;
        target.closest("[data-item-id]").querySelector('.withContext')?.dispatchEvent(new PointerEvent("contextmenu", {
            view: window, bubbles: true, cancelable: true, clientX, clientY
        }));
    }

    static _filterTalents(ev, target) {
        $(target).closest('.content').find('.allTalents').toggleClass('showAll');
        $(target).toggleClass("filtered");
    }

    static async _chRegenerate(ev, target) {
        ev.preventDefault();
        const setupData = await this.actor.setupRegeneration("regenerate", {}, this.getTokenId());
        this.actor.basicTest(setupData);
    }

    static async _chWeaponless(ev, target) {
        ev.preventDefault();
        // Weaponless attack logic
    }

    static async _chFallingDamage(ev, target) {
        ev.preventDefault();
        // Falling damage logic
    }

    static async _chRollCombat(ev, target) {
        ev.preventDefault();
        const itemId = this._getItemId(target);
        const mode = target.dataset.mode;
        const item = this.actor.items.get(itemId);
        const setupData = await this.actor.setupWeapon(item, mode, {}, this.getTokenId());
        this.actor.basicTest(setupData);
    }

    static async _conditionShow(ev, target) {
        ev.preventDefault();
        const id = target.dataset.id;
        const descriptor = $(target).parents(".statusEffect").attr("data-descriptor");
        
        if (ev.button == 0) {
            const origin = $(target).parents(".statusEffect").attr("data-origin");
            if (origin) {
                const document = await fromUuid(origin);
                document.sheet.render(true);
            } else {
                let effect;
                let text;
                if (descriptor) {
                    effect = CONFIG.statusEffects.find(x => x.id == descriptor);
                    text = $(`<div style="padding:5px;"><b><a class="chat-condition chatButton" data-id="${effect.id}"><img src="${effect.img}"/>${game.i18n.localize(effect.name)}</a></b>: ${game.i18n.localize(effect.description)}</div>`);
                } else {
                    effect = this.actor.effects.find(x => x.id == id);
                    if (effect) {
                        text = $(`<div style="padding:5px;"><b><a class="chat-condition chatButton" data-id="${effect.id}"><img src="${effect.img}"/>${game.i18n.localize(effect.name)}</a></b>: ${game.i18n.localize(effect.flags.dsk.description)}</div>`);
                    }
                }
                const elem = $(target).closest('.groupbox').find('.effectDescription');
                elem.fadeOut('fast', function() { elem.html(text).fadeIn('fast'); });
            }
        } else if (ev.button == 2 && !target.dataset.locked) {
            this._deleteActiveEffect(id);
        }
    }

    // Owner action handlers
    static async _schipUpdate(ev, target) {
        ev.preventDefault();
        let val = Number(target.dataset.val);
        const fullSchips = this.element.querySelectorAll(".fullSchip");
        if (val == 1 && fullSchips.length == 1) val = 0;
        await this.actor.update({ "system.stats.schips.value": val });
    }

    static async _deleteItemAction(ev, target) {
        const itemId = this._getItemId(target);
        this._deleteItem(itemId);
    }

    static async _loadWeapon(ev, target) {
        const itemId = this._getItemId(target);
        const item = this.actor.items.get(itemId).toObject();

        if (getProperty(item, "system.currentAmmo") === "") return;

        const update = { _id: itemId };
        if (ev.button == 0) {
            const lz = item.type == "trait" ? item.system.lz : ActorDSK.calcLZ(item, this.actor);
            update["system.reloadTimeprogress"] = Math.min(item.system.reloadTimeprogress + 1, lz);
        } else if (ev.button == 2) {
            update["system.reloadTimeprogress"] = 0;
        }

        await this.actor.updateEmbeddedDocuments("Item", [update]);
    }

    static async _itemSwapMag(ev, target) {
        await this.actor.swapMag(this._getItemId(target));
    }

    static async _itemToggle(ev, target) {
        const itemId = this._getItemId(target);
        const item = this.actor.items.get(itemId).toObject();

        switch (item.type) {
            case "armor":
            case "rangeweapon":
            case "meleeweapon":
            case "equipment":
                await this.actor.updateEmbeddedDocuments("Item", [{ _id: itemId, "system.worn.value": !item.system.worn.value }]);
                DSKSoundEffect.playEquipmentWearStatusChange(item);
                break;
        }
    }

    static async _swapWeaponHand(ev, target) {
        const itemId = this._getItemId(target);
        const item = this.actor.items.get(itemId);
        await this.actor.updateEmbeddedDocuments("Item", [{ _id: itemId, "system.worn.wrongGrip": !item.system.worn.wrongGrip }]);
    }

    static async _statusAdd(ev, target) {
        const status = target.dataset.id;
        if (status == "custom") {
            DSKStatusEffects.createCustomEffect(this.actor);
        } else {
            await this.actor.addCondition(status, 1, false, false);
        }
    }

    static async _disableRegeneration(ev, target) {
        const type = target.dataset.type;
        const prop = `system.repeatingEffects.disabled.${type}`;
        await this.actor.update({ [prop]: !getProperty(this.actor, prop) });
    }

    static async _conditionValue(ev, target) {
        const condKey = $(target).parents(".statusEffect").attr("data-descriptor");
        if (ev.button == 0) {
            await this.actor.addCondition(condKey, 1, false, false);
        } else if (ev.button == 2) {
            await this.actor.removeCondition(condKey, 1, false);
        }
    }

    static async _conditionToggle(ev, target) {
        if (!this.isEditable) return;
        
        const condKey = $(target).parents(".statusEffect").attr("data-id");
        const ef = this.actor.effects.get(condKey);
        await ef.update({ disabled: !ef.disabled });
    }

    static async _advanceWrapper(ev, target) {
        if (this.wrapperLocked) return;

        const funct = target.dataset.funct;
        const param = target.dataset.attr || this._getItemId(target);

        this.wrapperLocked = true;
        const icon = target.tagName == 'i' ? $(target) : $(target).find('i');
        icon.addClass('fa-spin fa-spinner');
        await this[funct](param);
        this.wrapperLocked = false;
        icon.removeClass('fa-spin fa-spinner');
    }

    static async _onMacroUseItem(ev, target) {
        const item = this.actor.items.get(this._getItemId(target));
        const onUse = new OnUseEffect(item);
        onUse.executeOnUseEffect();
    }

    static async _quantityClick(ev, target) {
        const itemId = this._getItemId(target);
        const item = this.actor.items.get(itemId).toObject();
        RuleChaos.increment(ev, item, "system.quantity", 0);
        await this.actor.updateEmbeddedDocuments("Item", [item]);
    }

    static async _consumeItem(ev, target) {
        if (ev.button == 2) {
            const itemId = this._getItemId(target);
            const item = this.actor.items.get(itemId);
            this.consumeItem(item);
        }
    }

    static async _itemPost(ev, target) {
        const itemId = this._getItemId(target);
        this.actor.items.get(itemId).postItem();
    }

    static _onItemCreate(ev, target) {
        ev.preventDefault();
        let data = duplicate(target.dataset);

        if (DSK.equipmentTypes[data.type]) {
            data.type = "equipment";
            data = mergeObject(data, {
                "system.category": target.getAttribute("item-section"),
                "system.effect": ""
            });
        }
        if (!["aggregatedTest", "ahnengabe"].includes(data.type)) {
            data["system.weight"] = 0;
            data["system.quantity"] = 0;
        }

        ItemDSK.defaultIcon(data);
        data["name"] = DSKUtility.categoryLocalization(data.type);
        this.actor.createEmbeddedDocuments("Item", [data]);
    }

    _getItemId(target) {
        return $(target).parents(".item").attr("data-item-id");
    }

    _saveSearchFields() {
        if (this.element === null) return;
        
        const html = $(this.element);
        this.searchFields = {
            talentFiltered: html.find(".filterTalents").hasClass("filtered"),
            searchText: html.find(".talentSearch").val(),
            gearSearch: html.find(".gearSearch").val()
        };
    }

    _restoreSearchFields() {
        if (this.searchFields == undefined) return;
        
        const html = $(this.element);
        if (this.searchFields.talentFiltered) {
            html.find(".filterTalents").addClass("filtered");
            html.find(".allTalents").removeClass("showAll");
        }
        const talentSearchInput = html.find(".talentSearch");
        talentSearchInput.val(this.searchFields.searchText);
        if (this.searchFields.searchText != "") {
            this._filterTalentsInput(talentSearchInput);
        }
        const gearSearchInput = html.find(".gearSearch");
        gearSearchInput.val(this.searchFields.gearSearch);
        if (this.searchFields.gearSearch != "") {
            this._filterGear(gearSearchInput);
        }
    }

    _saveCollapsed() {
        if (this.element === null) return;

        const html = $(this.element);
        this.collapsedBoxes = [];
        this.openDetails = [];
        const boxes = html.find(".ch-collapse i");
        for (let box of boxes) {
            this.collapsedBoxes.push($(box).attr("class"));
        }
        for (const detail of html.find('.expandDetails.shown')) {
            this.openDetails.push($(detail).closest('.item').attr("data-item-id"));
        }
    }

    _setCollapsed() {
        if (!this.collapsedBoxes) return;
        
        const html = $(this.element);
        const boxes = html.find(".ch-collapse i");
        for (let i = 0; i < boxes.length; i++) {
            $(boxes[i]).attr("class", this.collapsedBoxes[i]);
            if (this.collapsedBoxes[i] && this.collapsedBoxes[i].indexOf("fa-angle-down") != -1) {
                $(boxes[i]).closest('.groupbox').find('.row-section:nth-child(2)').hide();
            }
        }
    }

    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        this.wrapperLocked = false;
        
        return {
            ...context,
            actor: this.actor,
            system: this.actor.system,
            prepare: this.actor.prepareSheet({ details: this.openDetails }),
            sizeCategories: DSK.sizeCategories,
            isGM: game.user.isGM,
            initDies: { "": "-", "1d6": "1d6", "2d6": "2d6", "3d6": "3d6", "4d6": "4d6" },
            conditions: DSKStatusEffects.prepareActiveEffects(this.actor),
            enrichedOwnerdescription: await TextEditor.enrichHTML(getProperty(this.actor.system, "notes.owner"), { secrets: this.actor.isOwner }),
            enrichedGmdescription: await TextEditor.enrichHTML(getProperty(this.actor.system, "notes.gm"), { secrets: this.actor.isOwner }),
            enrichedNotes: await TextEditor.enrichHTML(getProperty(this.actor.system, "notes.description"), { secrets: this.actor.isOwner }),
            enrichedBiography: await TextEditor.enrichHTML(getProperty(this.actor.system, "notes.biography"), { secrets: this.actor.isOwner }),
            tabs: this._getTabs(),
        };
    }

    showLimited() {
        return !game.user.isGM && this.actor.limited;
    }

    getTokenId() {
        return this.token ? this.token.id : undefined;
    }

    async _onRender(context, options) {
        await super._onRender(context, options);
        const html = $(this.element);

        // Status effect menu
        html.find(".statusEffectMenu ul").on('mouseleave', ev => $(ev.currentTarget).fadeOut());
        
        // Ammo selector change
        html.find('.ammo-selector').on('change', async(ev) => {
            ev.preventDefault();
            const itemId = this._getItemId(ev.currentTarget);
            await this.actor.updateEmbeddedDocuments("Item", [{ _id: itemId, "system.currentAmmo": $(ev.currentTarget).val() }]);
        });

        // Skill advances change
        html.find('.skill-advances').on('change', async ev => {
            const itemId = this._getItemId(ev.currentTarget);
            await this.actor.updateEmbeddedDocuments("Item", [{ _id: itemId, "system.level": Number(ev.target.value) }]);
        });

        // Chat condition click
        html.on('click', '.chat-condition', ev => DSKChatListeners.postStatus($(ev.currentTarget).attr("data-id")));

        // Item hover menu for cards
        const deletehand = ev => this._deleteItem(this._getItemId(ev.currentTarget));
        const posthand = ev => { this.actor.items.get(this._getItemId(ev.currentTarget)).postItem(); };

        html.find(".cards .item").on('mouseenter', ev => {
            if (ev.currentTarget.getElementsByClassName('hovermenu').length == 0) {
                const div = document.createElement('div');
                div.classList.add("hovermenu");
                const del = document.createElement('i');
                del.classList.add("fas", "fa-times");
                del.title = game.i18n.localize('dsk.SHEET.DeleteItem');
                del.addEventListener('click', deletehand, false);
                const post = document.createElement('i');
                post.classList.add("fas", "fa-comment");
                post.title = game.i18n.localize('dsk.SHEET.PostItem');
                post.addEventListener('click', posthand, false);
                div.appendChild(post);
                div.appendChild(del);
                ev.currentTarget.appendChild(div);
            }
        });
        
        html.find(".cards .item").on('mouseleave', ev => {
            let e = ev.toElement || ev.relatedTarget;
            if (!e || e.parentNode == this || e == this) return;
            ev.currentTarget.querySelectorAll('.hovermenu').forEach(e => e.remove());
        });

        // Actor drag
        const uuid = this.actor.uuid;
        html.find('.actorDrag').each(function(i, cond) {
            cond.setAttribute("draggable", true);
            cond.addEventListener("dragstart", ev => {
                const dataTransfer = {
                    type: "Actor",
                    uuid
                };
                ev.dataTransfer.setData("text/plain", JSON.stringify(dataTransfer));
            });
        });

        // Search inputs
        const filterTalents = ev => this._filterTalentsInput($(ev.currentTarget));
        const talSearch = html.find('.talentSearch');
        talSearch.on('keyup', event => this._filterTalentsInput($(event.currentTarget)));
        talSearch[0]?.addEventListener("search", filterTalents, false);

        const filterConditions = ev => this._filterConditions($(ev.currentTarget));
        const condSearch = html.find('.conditionSearch');
        condSearch.on('keyup', event => this._filterConditions($(event.currentTarget)));
        condSearch[0]?.addEventListener("search", filterConditions, false);

        const filterGear = ev => this._filterGear($(ev.currentTarget));
        const gearSearch = html.find('.gearSearch');
        gearSearch.on('keyup', event => this._filterGear($(event.currentTarget)));
        gearSearch[0]?.addEventListener("search", filterGear, false);

        // Char image right click
        html.find('.charimg').on('mousedown', ev => {
            if (ev.button == 2) DSKUtility.showArtwork(this.actor, true);
        });

        DSKChatAutoCompletion.bindRollCommands(html);
        bindImgToCanvasDragStart(html, "img.charimg");
    }

    async _advanceAttribute(attr) {
        const advances = Number(this.actor.system.characteristics[attr].advances) + Number(this.actor.system.characteristics[attr].initial)
        const cost = DSKUtility._calculateAdvCost(advances, "Eig")
        if (await this._checkEnoughXP(cost)) {
            await this._updateAPs(cost, {
                [`system.characteristics.${attr}.advances`]: Number(this.actor.system.characteristics[attr].advances) + 1
            })
        }
    }

    async _refundAttributeAdvance(attr) {
        const advances = Number(this.actor.system.characteristics[attr].advances) + Number(this.actor.system.characteristics[attr].initial)
        if (Number(this.actor.system.characteristics[attr].advances) > 0) {
            const cost = DSKUtility._calculateAdvCost(advances, "Eig", 0) * -1
            await this._updateAPs(cost, {
                [`system.characteristics.${attr}.advances`]: Number(this.actor.system.characteristics[attr].advances) - 1
            })
        }
    }

    async _advancePoints(attr) {
        const advances = Number(this.actor.system.stats[attr].advances)
        const cost = DSKUtility._calculateAdvCost(advances, "D")
        if (await this._checkEnoughXP(cost) && this._checkMaximumPointAdvancement(attr, advances + 1)) {
            await this._updateAPs(cost, {
                [`system.stats.${attr}.advances`]: Number(this.actor.system.stats[attr].advances) + 1
            })
        }
    }

    async _refundPointsAdvance(attr) {
        const advances = Number(this.actor.system.stats[attr].advances)
        if (advances > 0) {
            const cost = DSKUtility._calculateAdvCost(advances, "D", 0) * -1
            await this._updateAPs(cost, {
                [`system.stats.${attr}.advances`]: Number(this.actor.system.stats[attr].advances) - 1
            })
        }
    }

    async _advanceItem(itemId) {
        let item = this.actor.items.get(itemId).toObject()
        let cost = DSKUtility._calculateAdvCost(Number(item.system.level), item.system.StF)
        if (await this._checkEnoughXP(cost) && this._checkMaximumItemAdvancement(item, Number(item.system.level) + 1)) {
            await this.actor.updateEmbeddedDocuments("Item", [{ _id: itemId, "system.level": item.system.level + 1 }])
            await this._updateAPs(cost)
        }
    }

    async _refundItemAdvance(itemId) {
        let item = this.actor.items.get(itemId).toObject()
        if (item.system.level > 0) {
            let cost = DSKUtility._calculateAdvCost(Number(item.system.level), item.system.StF, 0) * -1
            await this.actor.updateEmbeddedDocuments("Item", [{ _id: itemId, "system.level": item.system.level - 1 }])
            await this._updateAPs(cost)
        }
    }

    _checkMaximumItemAdvancement(item, newValue) {
        let result = false
        switch (item.type) {
            case "combatskill":
                result = newValue <= this.maxByAttr(item, 'dsk.LocalizedIDs.exceptionalCombatTechnique')
                break
            case "ahnengabe":
            case "skill":
                result = newValue <= this.maxByAttr(item, 'dsk.LocalizedIDs.exceptionalSkill')
                break
        }
        if (!result)
            ui.notifications.error("dsk.DSKError.AdvanceMaximumReached", { localize: true })

        return result
    }

    maxByAttr(item, specialability) {
        return Math.max(...[this.actor.system.characteristics[item.system.characteristic1].value, this.actor.system.characteristics[item.system.characteristic2].value]) + 2 + AdvantageRulesDSK.vantageStep(this.actor, `${game.i18n.localize(specialability)} (${item.name})`)
    }

    async _checkEnoughXP(cost) {
        return await this.actor.checkEnoughXP(cost)
    }

    _checkMaximumPointAdvancement(attr, newValue) {
        let result = false
        switch (attr) {
            case "LeP":
                result = newValue <= this.actor.system.characteristics.ko.value
                break
            case "AeP":
                result = newValue <= (this.actor.system.characteristics[this.actor.system.guidevalue] == undefined ? 0 : this.actor.system.characteristics[this.actor.system.guidevalue].value)
                break
        }
        if (!result)
            ui.notifications.error("dsk.DSKError.AdvanceMaximumReached", { localize: true })

        return result
    }

    _onItemCreate(event) {
        event.preventDefault();
        let header = event.currentTarget,
            data = duplicate(header.dataset);

        if (DSK.equipmentTypes[data.type]) {
            data.type = "equipment"
            data = mergeObject(data, {
                "system.category": event.currentTarget.attributes["item-section"].value,
                "system.effect": ""
            })
        }
        if(!["aggregatedTest", "ahnengabe"].includes(data.type)){
            data["system.weight"] = 0
            data["system.quantity"] = 0
        }

        ItemDSK.defaultIcon(data)
        data["name"] = DSKUtility.categoryLocalization(data.type)
        this.actor.createEmbeddedDocuments("Item", [data]);
    }

    _onMacroUseItem(ev) {
        const item = this.actor.items.get(this._getItemId(ev))
        const onUse = new OnUseEffect(item)
        onUse.executeOnUseEffect()
    }

    _filterGear(tar) {
        if (tar.val() != undefined) {
            let val = tar.val().toLowerCase().trim()
            let gear = $(this.element).find('.inventory .item')
            gear.removeClass('filterHide')
            gear.filter(function () {
                return $(this).find('a.item-edit').text().toLowerCase().trim().indexOf(val) == -1
            }).addClass('filterHide')
        }
    }

    //TODO replace this with foundry SearchFilter
    _filterTalentsInput(tar) {
        if (tar.val() != undefined) {
            let val = tar.val().toLowerCase().trim()
            let talents = $(this.element).find('.allTalents')
            talents.find('.item, .table-header, .table-title').removeClass('filterHide')
            talents.addClass('showAll').find('.item').filter(function () {
                return $(this).find('.talentName').text().toLowerCase().trim().indexOf(val) == -1
            }).addClass('filterHide')
            if (val.length > 0) {
                talents.find('.table-header, .table-title:not(:eq(0))').addClass("filterHide")
                talents.addClass("filterfull")
            } else
                talents.removeClass("filterfull")
        }
    }

    _filterConditions(tar) {
        if (tar.val() != undefined) {
            let val = tar.val().toLowerCase().trim()
            let conditions = $(this.element).find('.statusEffectMenu li:not(.search)')
            conditions.removeClass('filterHide')
            conditions.filter(function () {
                return game.i18n.localize($(this).find('a').attr('data-tooltip')).toLowerCase().trim().indexOf(val) == -1
            }).addClass('filterHide')
        }
    }

    async _deleteActiveEffect(id) {
        if (!this.isEditable) return

        const item = this.actor.effects.get(id)

        if (item) this.actor.deleteEmbeddedDocuments("ActiveEffect", [item.id])
    }

    _deleteItem(itemId) {
        if (!this.isEditable) return

        let item = this.actor.items.get(itemId)
        let message = game.i18n.format("dsk.DIALOG.DeleteItemDetail", { item: item.name })
        renderTemplate('systems/dsk/templates/dialog/delete-item-dialog.html', { message }).then(html => {
            foundry.applications.api.DialogV2.wait({
                window: { title: game.i18n.localize("dsk.DIALOG.deleteConfirmation") },
                content: html,
                buttons: [
                    {
                        action: "yes",
                        icon: "fa fa-check",
                        label: game.i18n.localize("dsk.yes"),
                        default: true,
                        callback: () => this._cleverDeleteItem(itemId)
                    },
                    {
                        action: "cancel",
                        icon: "fas fa-times",
                        label: game.i18n.localize("dsk.cancel")
                    }
                ],
            });
        });
    }

    async _addVantage(item, typeClass) {
        AdvantageRulesDSK.needsAdoption(this.actor, item, typeClass)
    }

    async _addSpecialAbility(item, typeClass) {
        SpecialabilityRulesDSK.needsAdoption(this.actor, item, typeClass)
    }

    async _cleverDeleteItem(itemId) {
        let item = this.actor.items.get(itemId)
        let itemsToDelete = [itemId]
        switch (item.type) {
            case "advantage":
            case "disadvantage":
                {
                    await AdvantageRulesDSK.vantageRemoved(this.actor, item)
                    let xpCost = item.system.ap * (item.system.level || 1)
                    if (/;/.test(item.system.ap)) {
                        const steps = item.system.ap.split(";").map(x => Number(x.trim()))
                        xpCost = 0
                        for (let i = 0; i < item.system.level; i++)
                            xpCost += steps[i]
                    }
                    await this._updateAPs(-1 * xpCost, {}, { render: false })
                }
                break;
            case "specialability":
                await SpecialabilityRulesDSK.abilityRemoved(this.actor, item)
                break;
            case "ahnengeschenk":
                await this._updateAPs(-1)
                break
            case "ahnengabe":
                {
                    let xpCost = 0
                    for (let i = 0; i <= item.system.level; i++) {
                        xpCost += DSKUtility._calculateAdvCost(i, item.system.StF, 0)
                    }
                    await this._updateAPs(xpCost * -1, {}, { render: false })
                }
                break
        }
        await this.actor.deleteEmbeddedDocuments("Item", itemsToDelete);
    }

    _getItemId(ev) {
        return $(ev.currentTarget).parents(".item").attr("data-item-id")
    }

    _onDragStart(event) {
        const li = event.currentTarget;
        if (event.target.classList.contains("content-link")) return;

        let dragData;

        if (li.dataset.itemId) {
            const item = this.actor.items.get(li.dataset.itemId);
            dragData = item.toDragData();
            if (li.dataset.mod) dragData.mod = li.dataset.mod
        }

        if (li.dataset.id) {
            const effect = this.actor.effects.get(li.dataset.id);
            dragData = effect.toDragData();
        }

        if (!dragData) return;

        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    }

    async _addUniqueItem(item) {
        item = duplicate(item)
        if (!this.actor.items.some(i => ItemDSK.areEquals(item, i)))
            return (await this.actor.createEmbeddedDocuments("Item", [item]))[0];
    }

    async handleItemCopy(item, typeClass) {
        if (DSK.equipmentCategories.includes(typeClass)) {
            item.name += " (Copy)"
            return await this._addLoot(item)
        }
    }

    async _addLoot(item) {
        item = duplicate(item)
        let res = this.actor.items.find(i => ItemDSK.areEquals(item, i));
        if (!res) {
            if (this._tabs[0].active == "combat" && item.system.worn) item.system.worn.value = true

            return (await this.actor.createEmbeddedDocuments("Item", [item]))[0];
        } else {
            return (await ItemDSK.stackItems(res, item, this.actor))[0]
        }
    }

    async _manageDragItems(item, typeClass) {
        switch (typeClass) {
            case "meleeweapon":
                case "rangeweapon":
                case "equipment":
                case "ammunition":
                case "consumable":
                case "armor":
                case "poison":
                    return await this._addLoot(item)
                    break
                case "disadvantage":
                case "advantage":
                    await this._addVantage(item, typeClass)
                    break;
                case "specialability":
                    await this._addSpecialAbility(item, typeClass)
                    break;
                case "information":
                case "skill":
                    await this._addUniqueItem(item)
                    break
                case "ahnengabe":
                case "ahnengeschenk":
                    await this._addSpellOrLiturgy(item)
                    break;
                case "effectwrapper":
                    await this._handleEffectWrapper(item)
                    break
            default:
                ui.notifications.error(game.i18n.format("dsk.DSKError.canNotBeAdded", { item: item.name, category: game.i18n.localize(item.type) }))
        }
    }

    async _updateAPs(APValue, update = {}, options = {}) {
        await this.actor._updateAPs(APValue, update, options)
    }

    async _addSpellOrLiturgy(item) {
        let res = this.actor.items.find(i => i.type == item.type && i.name == item.name);
        let apCost
        item = duplicate(item)
        if (!res) {
            switch (item.type) {
                case "ahnengabe":
                    apCost = DSKUtility._calculateAdvCost(0, item.system.StF, 0)
                    break
                case "ahnengeschenk":
                    apCost = 1
                    break
                default:
                    return
            }
            if (await this.actor.checkEnoughXP(apCost)) {
                await this._updateAPs(apCost, {}, { render: false })
                await this.actor.createEmbeddedDocuments("Item", [item])
            }
        }
    }

    async _handleEffectWrapper(item) {
        this.actor.createEmbeddedDocuments("ActiveEffect", item.effects.map(x => {
            x.origin = null
            return x
        }))
    }

    async _onDropItemCreate(itemData) {
        if (itemData instanceof Array) {
            return this.actor.createEmbeddedDocuments("Item", itemData);
        }
        return await this._manageDragItems(itemData, itemData.type)
    }

    async _onDropActor(event, data) {
        if (!this.actor.isOwner) return false;

        const { item, typeClass, selfTarget } = await itemFromDrop(data, this.id, false)

        if (selfTarget) return

        return await this._manageDragItems(item, typeClass)
    }

    async _onDropActiveEffect(event, data) {
        const effect = await ActiveEffect.implementation.fromDropData(data);
        if (!this.actor.isOwner || !effect) return false;
        if (this.actor.uuid === effect.parent?.uuid) return false;

        const ef = effect.toObject()
        ef.origin = this.actor.uuid
        return ActiveEffect.create(ef, { parent: this.actor });
    }

    async _onDropItem(event, data) {
        if (!this.actor.isOwner) return false;

        const item = await Item.implementation.fromDropData(data);
        const itemData = item.toObject();

        RuleChaos.obfuscateDropData(itemData, data.tabsinvisible)

        let container_id
        let parentItem = $(event.target).parents(".item")

        if (parentItem && parentItem.attr("data-category") == "bags" && DSK.equipmentCategories.includes(item.type)) {
            if (parentItem.attr("data-item-id") != item.id) container_id = parentItem.attr("data-item-id")
        }
        const selfTarget = this.actor.uuid === item.parent?.uuid
        if (selfTarget) {
            if (event.ctrlKey) {
                await this.handleItemCopy(itemData, item.type)
            } else if (container_id) {
                const upd = { _id: item.id, "system.parent_id": container_id }
                if (item.system.worn && item.system.worn.value)
                    upd["system.worn.value"] = false
                await this.actor.updateEmbeddedDocuments("Item", [upd])
            } else if (DSK.equipmentCategories.includes(item.type)) {
                await this.actor.updateEmbeddedDocuments("Item", [{ _id: item.id, system: { parent_id: 0 } }])
            }
            //return this._onSortItem(event, itemData);
        } else {
            await this._onDropItemCreate(itemData);
        }

        if (event.altKey && !selfTarget && DSK.equipmentCategories.includes(item.type))
            await this._handleRemoveSourceOnDrop(item)
    }
}