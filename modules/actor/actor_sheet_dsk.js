import DialogActorConfig from "../dialog/dialog-actorConfig.js";
import ItemDSK from "../item/item_dsk.js";
import DSKStatusEffects from "../status/status_effects.js";
import DSK from "../system/config.js";
import DSKUtility from "../system/dsk_utility.js";

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
        sheetData.enrichedOwnerdescription = await TextEditor.enrichHTML(getProperty(this.actor.system, "notes.pwner"), { secrets: true, async: true })
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
                title: game.i18n.localize("dsk.Delete Confirmation"),
                content: html,
                buttons: {
                    Yes: {
                        icon: '<i class="fa fa-check"></i>',
                        label: game.i18n.localize("yes"),
                        callback: () => this._cleverDeleteItem(itemId)
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: game.i18n.localize("cancel")
                    }
                },
                default: 'Yes'
            }).render(true)
        });
    }

    async _cleverDeleteItem(itemId) {
        let item = this.actor.items.get(itemId)
        let itemsToDelete = [itemId]
        switch (item.type) {
            case "advantage":
            case "disadvantage":
                {
                    await AdvantageRulesDSA5.vantageRemoved(this.actor, item)
                    let xpCost = item.system.APValue.value * item.system.step.value
                    if (/;/.test(item.system.APValue.value)) {
                        const steps = item.system.APValue.value.split(";").map(x => Number(x.trim()))
                        xpCost = 0
                        for (let i = 0; i < item.system.step.value; i++)
                            xpCost += steps[i]
                    }
                    await this._updateAPs(-1 * xpCost)
                }
                break;
            case "specialability":
                await SpecialabilityRulesDSA5.abilityRemoved(this.actor, item)
                break;
            case "blessing":
            case "magictrick":
                await this._updateAPs(-1)
                break
            case "ritual":
            case "ceremony":
            case "liturgy":
            case "spell":
                {
                    let xpCost = 0
                    for (let i = 0; i <= item.system.talentValue.value; i++) {
                        xpCost += DSKUtility._calculateAdvCost(i, item.system.StF.value, 0)
                    }
                    const extensions = this.actor.items.filter(i => i.type == "spellextension" && item.type == i.system.category && item.name == i.system.source)
                    if (extensions) {
                        xpCost += extensions.reduce((a, b) => { return a + b.system.APValue.value }, 0)
                        itemsToDelete.push(...extensions.map(x => x.id))
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

    async _manageDragItems(item, typeClass) {
        switch (typeClass) {
            default:
                ui.notifications.error(game.i18n.format("dsk.DSKError.canNotBeAdded", { item: item.name, category: game.i18n.localize(item.type) }))
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