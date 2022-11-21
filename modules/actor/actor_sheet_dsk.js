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

export default class ActorSheetDSK extends ActorSheet {
    async _render(force = false, options = {}) {
        this._saveSearchFields()
        this._saveCollapsed()
        await super._render(force, options);
        this._setCollapsed()
        this._restoreSeachFields()

        let elem = $(this._element)

        const tooltips = {
            ".close": "dsk.SHEET.Close",
            ".configure-sheet": "dsk.SHEET.Configure",
            ".configure-token": "dsk.SHEET.Token",
            ".import": "dsk.SHEET.Import",
            ".locksheet": "dsk.SHEET.Lock",
            ".library": "dsk.SHEET.Library",
            ".playerview": "dsk.SHEET.switchLimited",
            ".actorConfig": "dsk.SHEET.actorConfig"
        }
        for(let key of Object.keys(tooltips)){
            elem.find(key).attr("data-tooltip", game.i18n.localize(tooltips[key]));    
        }

        if (this.currentFocus) {
            elem.find('[data-item-id="' + this.currentFocus + '"] input').focus().select();
            this.currentFocus = null;
        }
    }

    async swapWeaponHand(ev){
        const itemId = this._getItemId(ev)
        const item = this.actor.items.get(itemId)
        await this.actor.updateEmbeddedDocuments("Item", [{_id: itemId, "system.worn.wrongGrip": !item.system.worn.wrongGrip}]);
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.tabs = [{ navSelector: ".tabs", contentSelector: ".content", initial: "skills" }]
        mergeObject(options, {
            width: 770,
            height: 740,
            scrollY: [".save-scroll"],
            dragDrop: [{ dragSelector: ".content .item", dropSelector: null }, { dragSelector: ".mainEffects .statusEffect", dropSelector: null }],
        });
        return options;
    }

    _saveSearchFields() {
        if (this.form === null)
            return;
        const html = $(this.form).parent()
        this.searchFields = {
            talentFiltered: $(html.find(".filterTalents")).hasClass("filtered"),
            searchText: $(html.find(".talentSearch")).val(),
            gearSearch: $(html.find(".gearSearch")).val()
        }
    }

    _restoreSeachFields() {
        if (this.searchFields != undefined) {
            const html = $(this.form).parent();
            if (this.searchFields.talentFiltered) {
                $(html.find(".filterTalents")).addClass("filtered")
                $(html.find(".allTalents")).removeClass("showAll")
            }
            const talentSearchInput = $(html.find(".talentSearch"))
            talentSearchInput.val(this.searchFields.searchText)
            if (this.searchFields.searchText != "") {
                this._filterTalents(talentSearchInput)
            }
            const gearSearchInput = $(html.find(".gearSearch"))
            gearSearchInput.val(this.searchFields.gearSearch)
            if (this.searchFields.searchText != "") {
                this._filterGear(gearSearchInput)
            }
        }
    }

    _saveCollapsed() {
        if (this.form === null)
            return;

        const html = $(this.form).parent();
        this.collapsedBoxes = [];
        this.openDetails = []
        let boxes = html.find(".ch-collapse i");
        for (let box of boxes) {
            this.collapsedBoxes.push($(box).attr("class"));
        }
        for (const detail of $(html.find('.expandDetails.shown'))) {
            this.openDetails.push($(detail).closest('.item').attr("data-item-id"))
        }
    }

    _setCollapsed() {
        const html = $(this.form).parent();
        if (this.collapsedBoxes) {
            let boxes = html.find(".ch-collapse i");
            for (let i = 0; i < boxes.length; i++) {
                $(boxes[i]).attr("class", this.collapsedBoxes[i]);
                if (this.collapsedBoxes[i] && this.collapsedBoxes[i].indexOf("fa-angle-down") != -1)
                    $(boxes[i]).closest('.groupbox').find('.row-section:nth-child(2)').hide()
            }
        }
    }

    async getData(options) {
        const baseData = await super.getData(options);
        const sheetData = { actor: baseData.actor, editable: baseData.editable, limited: baseData.limited, owner: baseData.owner }
        const prepare = this.actor.prepareSheet({ details: this.openDetails })
        mergeObject(sheetData.actor, prepare)
        sheetData["sizeCategories"] = DSK.sizeCategories
        sheetData.isGM = game.user.isGM;
        sheetData["initDies"] = { "": "-", "1d6": "1d6", "2d6": "2d6", "3d6": "3d6", "4d6": "4d6" }
        DSKStatusEffects.prepareActiveEffects(this.actor, sheetData)
        sheetData.enrichedOwnerdescription = await TextEditor.enrichHTML(getProperty(this.actor.system, "notes.owner"), { secrets: true, async: true })
        sheetData.enrichedGmdescription = await TextEditor.enrichHTML(getProperty(this.actor.system, "notes.gm"), { secrets: true, async: true })
        sheetData.enrichedNotes = await TextEditor.enrichHTML(getProperty(this.actor.system, "notes.description"), { secrets: true, async: true })
        sheetData.enrichedBiography = await TextEditor.enrichHTML(getProperty(this.actor.system, "notes.biography"), { secrets: true, async: true })

        return sheetData;
    }

    async _openLibrary() {
        game.dsk.itemLibrary.render(true)
    }

    async _configActor() {
        DialogActorConfig.buildDialog(this.actor)
    }

    _getHeaderButtons() {
        let buttons = super._getHeaderButtons();
        buttons.unshift({
            class: "library",
            icon: `fas fa-university`,
            onclick: async () => this._openLibrary()
        })
        if (this.actor.isOwner) {
            buttons.unshift({
                class: "actorConfig",
                icon: `fas fa-link`,
                onclick: async () => this._configActor()
            })
        }
        if (this.actor.system.canAdvance) {
            buttons.unshift({
                class: "locksheet",
                icon: `fas fa-${this.actor.system.sheetLocked ? "" : "un"}lock`,
                onclick: async ev => this._changeAdvanceLock(ev)
            })
        }
        return buttons
    }

    async _changeAdvanceLock(ev) {
        await this.actor.update({ "system.sheetLocked": !this.actor.system.sheetLocked })
        $(ev.currentTarget).find("i").toggleClass("fa-unlock fa-lock")
    }

    showLimited() {
        return !game.user.isGM && this.actor.limited
    }

    getTokenId() {
        return this.token ? this.token.id : undefined
    }

    activateListeners(html) {
        super.activateListeners(html);

        const posthand = ev => { this.actor.items.get(this._getItemId(ev)).postItem() }

        html.find('.schip').click(ev => {
            ev.preventDefault()
            let val = Number(ev.currentTarget.getAttribute("data-val"))
            if (val == 1 && $(this.form).find(".fullSchip").length == 1) val = 0

            this.actor.update({"system.stats.schips.value": val})
        })

        html.find('.swapWeaponHand').click(ev => this.swapWeaponHand(ev))

        html.find('.loadWeapon').mousedown(async(ev) => {
            const itemId = this._getItemId(ev)
            const item = this.actor.items.get(itemId).toObject()

            if (getProperty(item, "system.currentAmmo") === "") return

            const update = {_id: itemId}
            if (ev.button == 0){
                const lz = item.type == "trait" ? item.system.lz : ActorDSK.calcLZ(item, this.actor)
                update["system.reloadTimeprogress"] = Math.min(item.system.reloadTimeprogress + 1, lz)
            }                
            else if (ev.button == 2)
                update["system.reloadTimeprogress"] = 0

            await this.actor.updateEmbeddedDocuments("Item", [update]);
        })

        html.find('.item-swapMag').click(async(ev) => {
            await this.actor.swapMag(this._getItemId(ev))
        })

        html.find('.ammo-selector').change(async(ev) => {
            ev.preventDefault()
            const itemId = this._getItemId(ev);
            await this.actor.updateEmbeddedDocuments("Item", [{ _id: itemId, "system.currentAmmo": $(ev.currentTarget).val() }]);
        })

        html.find('.condition-edit').click(ev => {
            const effect = this.actor.effects.get($(ev.currentTarget).attr("data-id"))
            effect.sheet.render(true)
        })

        html.find('.ch-collapse').click(ev => {
            $(ev.currentTarget).find('i').toggleClass("fa-angle-up fa-angle-down")
            $(ev.currentTarget).closest(".groupbox").find('.row-section:nth-child(2)').fadeToggle()
        })

        html.find('.item-toggle').click(ev => {
            const itemId = this._getItemId(ev);
            let item = this.actor.items.get(itemId).toObject()

            switch (item.type) {
                case "armor":
                case "rangeweapon":
                case "meleeweapon":
                case "equipment":
                    this.actor.updateEmbeddedDocuments("Item", [{ _id: itemId, "system.worn.value": !item.system.worn.value }]);
                    DSKSoundEffect.playEquipmentWearStatusChange(item)
                    break;
            }
        });

        html.find(".status-create").click(ev => {
            let menu = $(ev.currentTarget).closest(".statusEffectMenu").find('ul')
            menu.fadeIn('fast', () => { menu.find('input').focus() })
        })
        html.find(".statusEffectMenu ul").mouseleave(ev => $(ev.currentTarget).fadeOut())
        html.find(".status-add").click(async(ev) => {
            let status = $(ev.currentTarget).attr("data-id")
            if (status == "custom") {
                DSKStatusEffects.createCustomEffect(this.actor)
            } else
                await this.actor.addCondition(status, 1, false, false)
        })

        html.find('.skill-select').mousedown(ev => {
            const itemId = this._getItemId(ev);
            let skill = this.actor.items.get(itemId);

            if (ev.button == 0)
                this.actor.setupSkill(skill, {}, this.getTokenId()).then(setupData => {
                    this.actor.basicTest(setupData)
                });
            else if (ev.button == 2)
                skill.sheet.render(true);
        });

        html.find(".advance-attribute").mousedown(ev => this.advanceWrapper(ev, "_advanceAttribute", $(ev.currentTarget).attr("data-attr")))
        html.find(".refund-attribute").mousedown(ev => this.advanceWrapper(ev, "_refundAttributeAdvance", $(ev.currentTarget).attr("data-attr")))
        html.find(".advance-item").mousedown(ev => this.advanceWrapper(ev, "_advanceItem", this._getItemId(ev)))
        html.find(".refund-item").mousedown(ev => this.advanceWrapper(ev, "_refundItemAdvance", this._getItemId(ev)))
        html.find(".advance-points").mousedown(ev => this.advanceWrapper(ev, "_advancePoints", $(ev.currentTarget).attr("data-attr")))
        html.find(".refund-points").mousedown(ev => this.advanceWrapper(ev, "_refundPointsAdvance", $(ev.currentTarget).attr("data-attr")))

        html.find('.spell-select').mousedown(ev => {
            const itemId = this._getItemId(ev);
            let skill = this.actor.items.get(itemId);

            if (ev.button == 0)
                this.actor.setupSpell(skill, {}, this.getTokenId()).then(setupData => this.actor.basicTest(setupData));

            else if (ev.button == 2)
                skill.sheet.render(true);
        });

        html.find('.quantity-click').mousedown(ev => {
            const itemId = this._getItemId(ev);
            let item = this.actor.items.get(itemId).toObject()
            RuleChaos.increment(ev, item, "system.quantity", 0)
            this.actor.updateEmbeddedDocuments("Item", [item]);
        });

        html.find(".item-post").click(ev => posthand(ev))

        html.find('.item-dropdown').click(ev => {
            ev.preventDefault()
            $(ev.currentTarget).closest('.item').find('.expandDetails:first').toggleClass('shown')
        })

        html.find('.condition-show').mousedown(ev => {
            ev.preventDefault()
            const id = ev.currentTarget.dataset.id
            const descriptor = $(ev.currentTarget).parents(".statusEffect").attr("data-descriptor")
            if (ev.button == 0) {
                const origin = $(ev.currentTarget).parents(".statusEffect").attr("data-origin")
                if (origin) {
                    fromUuid(origin).then(document => document.sheet.render(true))
                } else {
                    let effect
                    let text
                    if (descriptor) {
                        effect = CONFIG.statusEffects.find(x => x.id == descriptor)
                        text = $(`<div style="padding:5px;"><b><a class="chat-condition chatButton" data-id="${effect.id}"><img src="${effect.icon}"/>${game.i18n.localize(effect.label)}</a></b>: ${game.i18n.localize(effect.description)}</div>`)
                    } else {
                        //search temporary effects
                        effect = this.actor.effects.find(x => x.id == id)
                        if (effect) {
                            text = $(`<div style="padding:5px;"><b><a class="chat-condition chatButton" data-id="${effect.id}"><img src="${effect.icon}"/>${game.i18n.localize(effect.label)}</a></b>: ${game.i18n.localize(effect.flags.dsk.description)}</div>`)
                        }
                    }
                    const elem = $(ev.currentTarget).closest('.groupbox').find('.effectDescription')
                    elem.fadeOut('fast', function() { elem.html(text).fadeIn('fast') })
                }
            } else if (ev.button == 2 && !ev.currentTarget.dataset.locked) {
                this._deleteActiveEffect(id)
            }
        })
        html.on('click', '.chat-condition', ev => DSKChatListeners.postStatus($(ev.currentTarget).attr("data-id")))

        html.find('.skill-advances').change(async ev => {
            const itemId = this._getItemId(ev);
            await this.actor.updateEmbeddedDocuments("Item", [{ _id: itemId, "system.level": Number(ev.target.value) }]);
        });
        html.find('.item-edit').click(ev => {
            ev.preventDefault()
            const itemId = this._getItemId(ev);
            const item = this.actor.items.get(itemId)
            item.sheet.render(true);
        });

        html.find('.disableRegeneration').click(ev => {
            const type = ev.currentTarget.dataset.type
            const prop = `system.repeatingEffects.disabled.${type}`
            this.actor.update({[prop]: !getProperty(this.actor, prop)})
        })

        html.find(".consume-item").mousedown(ev => {
            if (ev.button == 2) {
                const itemId = this._getItemId(ev);
                const item = this.actor.items.get(itemId)
                this.consumeItem(item)
            }
        })
        html.find('.ch-value').click(event => {
            event.preventDefault();
            let characteristic = event.currentTarget.attributes["data-char"].value;
            this.actor.setupCharacteristic(characteristic, {}, this.getTokenId()).then(setupData => this.actor.basicTest(setupData))
        });
        html.find('.ch-regenerate').click(event => {
            event.preventDefault();
            this.actor.setupRegeneration("regenerate", {}, this.getTokenId()).then(setupData => this.actor.basicTest(setupData))
        });

        html.find('.item-create').click(ev => this._onItemCreate(ev));

        html.find('.ch-rollCombat').click(event => {
            event.preventDefault();
            let itemId = this._getItemId(event);
            const mode = $(event.currentTarget).attr("data-mode")
            const item = this.actor.items.get(itemId)
            this.actor.setupWeapon(item, mode, {}, this.getTokenId()).then(setupData => this.actor.basicTest(setupData))
        });

        const deletehand = ev => this._deleteItem(ev)
        html.find('.onUseItem').click(ev => this._onMacroUseItem(ev))

        html.find(".cards .item").mouseenter(ev => {

            if (ev.currentTarget.getElementsByClassName('hovermenu').length == 0) {
                const div = document.createElement('div')
                div.classList.add("hovermenu")
                const del = document.createElement('i')
                del.classList.add("fas", "fa-times")
                del.title = game.i18n.localize('dsk.SHEET.DeleteItem')
                del.addEventListener('click', deletehand, false)
                const post = document.createElement('i')
                post.classList.add("fas", "fa-comment")
                post.title = game.i18n.localize('dsk.SHEET.PostItem')
                post.addEventListener('click', posthand, false)
                div.appendChild(post)
                div.appendChild(del)
                ev.currentTarget.appendChild(div)
            }
        });
        html.find(".cards .item").mouseleave(ev => {
            let e = ev.toElement || ev.relatedTarget;
            if (!e || e.parentNode == this || e == this)
                return;

            ev.currentTarget.querySelectorAll('.hovermenu').forEach(e => e.remove());
        });

        const uuid = this.actor.uuid
        html.find('.actorDrag').each(function(i, cond) {
            cond.setAttribute("draggable", true);
            cond.addEventListener("dragstart", ev => {
                let dataTransfer = {
                    type: "Actor",
                    uuid
                }
                ev.dataTransfer.setData("text/plain", JSON.stringify(dataTransfer));
            });
        })

        html.find('.item-delete').click(ev => this._deleteItem(ev))

        html.find('.filterTalents').click(event => {
            $(event.currentTarget).closest('.content').find('.allTalents').toggleClass('showAll')
            $(event.currentTarget).toggleClass("filtered")
        })

        html.find(".condition-value").mousedown(async(ev) => {
            let condKey = $(ev.currentTarget).parents(".statusEffect").attr("data-descriptor")
            if (ev.button == 0)
                await this.actor.addCondition(condKey, 1, false, false)
            else if (ev.button == 2)
                await this.actor.removeCondition(condKey, 1, false)
        })

        html.find(".condition-toggle").mousedown(async(ev) => {
            if (!this.isEditable) return
            
            let condKey = $(ev.currentTarget).parents(".statusEffect").attr("data-id")
            let ef = this.actor.effects.get(condKey)
            await ef.update({ disabled: !ef.disabled })
        })

        html.find('.charimg').mousedown(ev => {
            if (ev.button == 2) DSKUtility.showArtwork(this.actor, true)
        })

        DSKChatAutoCompletion.bindRollCommands(html)

        let filterTalents = ev => this._filterTalents($(ev.currentTarget))
        let talSearch = html.find('.talentSearch')
        talSearch.keyup(event => this._filterTalents($(event.currentTarget)))
        talSearch[0] && talSearch[0].addEventListener("search", filterTalents, false);

        let filterConditions = ev => this._filterConditions($(ev.currentTarget))
        let condSearch = html.find('.conditionSearch')
        condSearch.keyup(event => this._filterConditions($(event.currentTarget)))
        condSearch[0] && condSearch[0].addEventListener("search", filterConditions, false);

        let filterGear = ev => this._filterGear($(ev.currentTarget))
        let gearSearch = html.find('.gearSearch')
        gearSearch.keyup(event => this._filterGear($(event.currentTarget)))
        gearSearch[0] && gearSearch[0].addEventListener("search", filterGear, false);

        bindImgToCanvasDragStart(html, "img.charimg")
    }

    async advanceWrapper(ev, funct, param) {
        const i = $(ev.currentTarget).find('i')
        if (!i.hasClass("fa-spin")) {
            i.addClass("fa-spin fa-spinner")
            await this[funct](param)
            i.removeClass("fa-spin fa-spinner")
        }
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
            ui.notifications.error(game.i18n.localize("dsk.DSKError.AdvanceMaximumReached"))

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
            ui.notifications.error(game.i18n.localize("dsk.DSKError.AdvanceMaximumReached"))

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
    _filterTalents(tar) {
        if (tar.val() != undefined) {
            let val = tar.val().toLowerCase().trim()
            let talents = $(this.form).parent().find('.allTalents')
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
            let conditions = $(this.form).find('.statusEffectMenu li:not(.search)')
            conditions.removeClass('filterHide')
            conditions.filter(function () {
                return $(this).find('a').attr('data-tooltip').toLowerCase().trim().indexOf(val) == -1
            }).addClass('filterHide')
        }
    }

    async _deleteActiveEffect(id) {
        if (!this.isEditable) return

        let item = this.actor.effects.find(x => x.id == id)

        if (item) {
            let actor = this.token ? this.token.actor : this.actor

            if (actor) await this.actor.deleteEmbeddedDocuments("ActiveEffect", [item.id])

            //Hooks.call("deleteActorActiveEffect", this.actor, item)
        }
    }

    _deleteItem(ev) {
        if (!this.isEditable) return

        const itemId = this._getItemId(ev);
        let item = this.actor.items.get(itemId)
        let message = game.i18n.format("dsk.DIALOG.DeleteItemDetail", { item: item.name })
        renderTemplate('systems/dsk/templates/dialog/delete-item-dialog.html', { message }).then(html => {
            new Dialog({
                title: game.i18n.localize("dsk.DIALOG.deleteConfirmation"),
                content: html,
                buttons: {
                    Yes: {
                        icon: '<i class="fa fa-check"></i>',
                        label: game.i18n.localize("dsk.yes"),
                        callback: () => this._cleverDeleteItem(itemId)
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: game.i18n.localize("dsk.cancel")
                    }
                },
                default: 'Yes'
            }).render(true)
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
                    let xpCost = item.system.ap * item.system.level
                    if (/;/.test(item.system.ap)) {
                        const steps = item.system.ap.split(";").map(x => Number(x.trim()))
                        xpCost = 0
                        for (let i = 0; i < item.system.level; i++)
                            xpCost += steps[i]
                    }
                    await this._updateAPs(-1 * xpCost)
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
                    await this._updateAPs(xpCost * -1)
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

    async _updateAPs(APValue, update = {}) {
        await this.actor._updateAPs(APValue, update)
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
                await this._updateAPs(apCost)
                await this.actor.createEmbeddedDocuments("Item", [item])
            }
        }
    }

    async _addUniqueItem(item) {
        item = duplicate(item)
        if (!this.actor.items.some(i => ItemDSK.areEquals(item, i)))
            return (await this.actor.createEmbeddedDocuments("Item", [item]))[0];
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