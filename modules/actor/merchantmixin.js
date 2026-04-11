import { DefaultAppv2 } from "./baseapp.js";
import ItemDSK from "../item/item_dsk.js";
import DSK from "../system/config.js";
import DSKSoundEffect from "../system/dsk-soundeffect.js";
import DSKUtility from "../system/dsk_utility.js";
import DSKPayment from "../system/payment.js";
import { fetchBagItems, transferBagWithContents } from "../hooks/itemDrop.js";
import RuleChaos from "../system/rule_chaos.js";
const { mergeObject, getProperty, duplicate } = foundry.utils
const { renderTemplate } = foundry.applications.handlebars;
//todo add on use button to merchant sheet

export const MerchantSheetMixin = (superclass) => {
    const baseParts = superclass.PARTS ?? {};
    const limitedParts = superclass.LIMITEDPARTS ?? {};

    return class extends superclass {
        static merchantDefaultTypes = new Set(['merchant', 'loot', 'epic']);

        static DEFAULT_OPTIONS = {
            classes: ['merchant-sheet'],
            actions: {
                ...superclass.DEFAULT_OPTIONS?.actions,
                allowMerchant: this._allowMerchant,
                toggleAllAllowMerchant: this._toggleAllAllowMerchant,
                lockTradeSection: this._lockTradeSection,
                clearInventory: this._clearInventory,
                randomGoods: this._randomGoods,
                setCustomPrice: this._setCustomPrice,
                choseTradefriend: this._choseTradefriend,
                removeOtherTradeFriend: this._removeOtherTradeFriend,
                toggleTradeLock: this._toggleTradeLock,
                itemExternalEdit: this._itemExternalEdit,
                tradeWrapper: this._tradeWrapper,
                changeAmountAllItems: { handler: this.changeAmountAllItems, buttons: [0, 2] },
            },
            ownerActions: {
                ...superclass.DEFAULT_OPTIONS?.actions,
                allowMerchant: this._allowMerchant,
                toggleAllAllowMerchant: this._toggleAllAllowMerchant,
                lockTradeSection: this._lockTradeSection,
                clearInventory: this._clearInventory,
                randomGoods: this._randomGoods,
                setCustomPrice: this._setCustomPrice,
                choseTradefriend: this._choseTradefriend,
                removeOtherTradeFriend: this._removeOtherTradeFriend,
                toggleTradeLock: this._toggleTradeLock,
                itemExternalEdit: this._itemExternalEdit,
                tradeWrapper: this._tradeWrapper,
                changeAmountAllItems: { handler: this.changeAmountAllItems, buttons: [0, 2] },
            },
            majorButtons: [
                ...(superclass.DEFAULT_OPTIONS?.majorButtons || []),
            ],
        };

        static PARTS = {
            header: {
                template: 'systems/dsk/templates/actors/actorv2/merchant-header.hbs',
                templates: [
                    'systems/dsk/templates/actors/merchant/merchant-header.hbs',
                    'systems/dsk/templates/actors/parts/rollhead.hbs',
                    'systems/dsk/templates/actors/parts/healthbar.hbs',
                    'systems/dsk/templates/actors/actorv2/avatar.hbs',
                ],
            },
            tabs: baseParts.tabs,
            main: {
                template: 'systems/dsk/templates/actors/actor-main.hbs',
                scrollable: [''],
            },
            combat: baseParts.combat,
            skills: baseParts.skills,
            magic: baseParts.magic,
            inventory: {
                template: 'systems/dsk/templates/actors/merchant/merchant-commerce.hbs',
                scrollable: [''],
                templates: [
                    'systems/dsk/templates/actors/parts/gearSearch.hbs',
                    'systems/dsk/templates/actors/parts/containerContent.hbs',
                    'systems/dsk/templates/actors/merchant/merchant-permission-part.hbs',
                ],
            },
            status: baseParts.status,
            notes: baseParts.notes,
        };

        static MERCHANTPARTS = {
            merchant: {
                header: {
                    template: 'systems/dsk/templates/actors/merchant/merchant_limited_header.hbs',
                },
                tabs: baseParts.tabs,
                inventory: {
                    template: 'systems/dsk/templates/actors/merchant/merchant-limited.hbs',
                    templates: ['systems/dsk/templates/actors/parts/gearSearch.hbs'],
                },
                notes: {
                    template: 'systems/dsk/templates/actors/actor-notes.hbs',
                    scrollable: [''],
                },
            },
            loot: {
                inventory: {
                    template: 'systems/dsk/templates/actors/merchant/merchant-limited-loot.hbs',
                    templates: ['systems/dsk/templates/actors/parts/gearSearch.hbs'],
                },
            },
            epic: {
                tabs: baseParts.tabs,
                inventory: {
                    template: 'systems/dsk/templates/actors/merchant/merchant-epic.hbs',
                },
                notes: {
                    template: 'systems/dsk/templates/actors/actor-notes.hbs',
                    scrollable: [''],
                },
            },
        };


    _configureRenderParts(options) {
        if (this.merchantSheetActivated()) {
            const merchantType = getProperty(this.actor.system, "merchant.merchantType");
            if (this.constructor.merchantDefaultTypes.has(merchantType)) {
                return foundry.utils.deepClone(this.constructor.MERCHANTPARTS[merchantType]);
            }
            return foundry.utils.deepClone(limitedParts);
        }
        return super._configureRenderParts(options);
    }

    cleanTabs(tabs) {
        if (this.merchantSheetActivated()) {
            let toKeep;
            const merchantType = getProperty(this.actor.system, "merchant.merchantType") || "none";
            switch (merchantType) {
                case "epic":
                case "merchant":
                    toKeep = new Set(["inventory", "notes"]);
                    break;
                case "loot":
                    toKeep = new Set(["inventory"]);
                    break;
            }

            if (toKeep) {
                let hasAnyActive = false;
                for (const tab of Object.keys(tabs)) {
                    if (!toKeep.has(tab)) {
                        delete tabs[tab];
                        continue;
                    }
                    hasAnyActive = hasAnyActive || tabs[tab].active;
                }
                if (!hasAnyActive && tabs.inventory) {
                    tabs.inventory.active = true;
                    tabs.inventory.cssClass = "active";
                }
            }
        } else {
            super.cleanTabs(tabs);
        }
    }

    _toggleDisabled(disabled) {
        console.warn("Merchant sheet does not support disabled state");
    }

    _prepareTabs(group) {
        const tabs = super._prepareTabs(group);
        const merchantType = getProperty(this.actor.system, "merchant.merchantType") || "none";
        if (tabs.inventory) tabs.inventory.label = DSK.merchantTypes[merchantType];
        return tabs;
    }

    merchantSheetActivated() {
        return this.showLimited() || (this.playerViewEnabled() && this.constructor.merchantDefaultTypes.has(getProperty(this.actor.system, "merchant.merchantType")))
    }

    async allowMerchant(ids, allow) {
        let curPermissions = duplicate(this.actor.ownership)
        const newPerm = allow ? 1 : 0
        for (const id of ids) {
            curPermissions[id] = newPerm
        }
        await this.actor.update({ ownership: curPermissions }, { diff: false, recursive: false, noHook: true })
    }

    async _onRender(context, options) {
        await super._onRender(context, options);
        const html = $(this.element);
        html.find('.customPriceTag').on('change', async (ev) => this._handleCustomPriceChange(ev))
            .on('blur', (ev) => $(ev.currentTarget).closest('.setCustomPrice').removeClass("edit"));
        html.find('.gearSearch').prop("disabled", false);
    }

    // Static action handlers for AppV2
    static async _allowMerchant(ev, target) {
        const id = target.dataset.userId;
        const shouldAllow = !target.classList.contains("fa-check-circle");
        await this.allowMerchant([id], shouldAllow);
        target.classList.toggle("fa-circle");
        target.classList.toggle("fa-check-circle");
    }

    static async _toggleAllAllowMerchant(ev, target) {
        const ids = game.users.filter(x => !x.isGM).map(x => x.id);
        const allow = target.dataset.lock == "true";
        await this.allowMerchant(ids, allow);
        this.render();
    }

    static _lockTradeSection(ev, target) {
        this.lockTradeSection(target);
    }

    static _randomGoods(ev, target) {
        this.randomGoods(ev);
    }

    static _clearInventory(ev, target) {
        this.clearInventory(ev);
    }

    static _removeOtherTradeFriend(ev, target) {
        this.otherTradeFriend = undefined;
        this.render(true);
    }

    static _choseTradefriend(ev, target) {
        SelectTradefriendDialog.getDialog(this).then((dialog) => dialog?.render(true));
    }

    static _setCustomPrice(ev, target) {
        target.classList.toggle("edit");
    }

    static _itemExternalEdit(ev, target) {
        ev.preventDefault();
        let itemId = this._getItemId(ev);
        const item = this.getTradeFriend().items.get(itemId);
        item.sheet.render(true);
    }

    static _toggleTradeLock(ev, target) {
        const itemId = this._getItemId(ev);
        const item = this.actor.items.get(itemId);
        this.actor.updateEmbeddedDocuments("Item", [{ _id: item.id, "system.tradeLocked": !item.system.tradeLocked }]);
    }

    static _tradeWrapper(ev, target) {
        const dataset = { ...target.dataset };
        dataset.itemId = this._getItemId(ev);
        dataset.amount = ev.ctrlKey ? 10 : 1;
        const action = target.dataset.fct;
        if (action && typeof this[action] === "function") this[action](dataset);
    }

    static _changeAmountAllItems(ev, target) {
        this.changeAmountAllItems(ev, target);
    }

    async _handleCustomPriceChange(ev) {
        await this.setCustomPrice(ev);
    }

    _canDragStart(selector) {
        return !this.merchantSheetActivated() && this.isEditable;
    }

    async setCustomPrice(ev) {
        ev.stopPropagation()
        ev.preventDefault()
        const itemId = this._getItemId(ev);

        await this.actor.updateEmbeddedDocuments("Item", [{ _id: itemId, "flags.dsk.customPriceTag": Number(ev.target.value) }])
    }

    async lockTradeSection(target) {
        const updates = []
        const rule = this.filterRule(target)
        let newValue
        for (let item of this.actor.items) {
            if (rule(item)) {
                let upd = item.toObject()
                if (newValue === undefined) newValue = !upd.system.tradeLocked

                upd.system.tradeLocked = newValue
                updates.push(upd)
            }
        }
        this.actor.updateEmbeddedDocuments("Item", updates);
    }

    filterRule(target) {
        const filter = target.dataset.type
        if (DSK.equipmentTypes[filter]) {
            return (item) => { return item.type == "equipment" && item.system.category == filter }
        } else {
            return (item) => { return item.type == filter && DSK.equipmentCategories.has(item.type) }
        }
    }

    async changeAmountAllItems(ev, target) {
        const updates = []
        const rule = this.filterRule(target)
        for (let item of this.actor.items) {
            if (rule(item)) {
                let upd = item.toObject()
                RuleChaos.increment(ev, upd, "system.quantity", 0)
                updates.push(upd)
            }
        }
        this.actor.updateEmbeddedDocuments("Item", updates);
    }

    playerViewEnabled() {
        return getProperty(this.actor.system, "playerView")
    }

    async buyItem(dataset) {
        DSKSoundEffect.playMoneySound();
        await this.transferItem(this.actor, this.getTradeFriend(), dataset, true)
    }
    async sellItem(dataset) {
        DSKSoundEffect.playMoneySound();
        await this.transferItem(this.getTradeFriend(), this.actor, dataset, false)
    }

    async randomGoods(ev) {
        const html = await renderTemplate('systems/dsk/templates/dialog/randomGoods-dialog.hbs', { categories: DSK.equipmentCategories })
        foundry.applications.api.DialogV2.wait({
            window: { title: "dsk.MERCHANT.randomGoods" },
            content: html,
            buttons: [
                {
                    action: "yes",
                    icon: "fa fa-check",
                    label: "dsk.yes",
                    default: true,
                    callback: (event, button, dialog) => this.addRandomGoods(this.actor, $(button.form), ev)
                },
                {
                    action: "cancel",
                    icon: "fas fa-times",
                    label: "dsk.cancel"
                }
            ]
        });
    }

    async clearInventory(ev) {
        foundry.applications.api.DialogV2.wait({
            window: { title: "dsk.MERCHANT.clearInventory" },
            content: game.i18n.localize("dsk.MERCHANT.deleteAllGoods"),
            buttons: [
                {
                    action: "yes",
                    icon: "fa fa-check",
                    label: "dsk.yes",
                    default: true,
                    callback: () => {
                        this.removeAllGoods(this.actor, ev)
                    }
                },
                {
                    action: "cancel",
                    icon: "fas fa-times",
                    label: "dsk.cancel"
                }
            ]
        });
    }

    async addRandomGoods(actor, dlg, ev) {
        let text = $(ev.currentTarget).text()
        $(ev.currentTarget).html(' <i class="fa fa-spin fa-spinner"></i>')

        let categories = []
        dlg.find('input[type="checkbox"]:checked').each(function() {
            const name = $(this).val()
            categories.push({
                name,
                count: Number(dlg.find(`input[name="each_${name}"]`).val()),
                number: Number(dlg.find(`input[name="number_${name}"]`).val())
            })
        })

        const itemLibrary = game.dsk.itemLibrary
        if (!itemLibrary.equipmentBuild) {
            await itemLibrary.buildEquipmentIndex()
        }

        let items = []
        for (let cat of categories) {
            const randomItems = (await itemLibrary.getRandomItems(cat.name, cat.number)).map(x => {
                const elem = x.toObject()
                elem.system.quantity = cat.count
                return elem
            })

            items.push(...randomItems)
        }

        let seen = {}
        items = items.filter(function(x) {
            let domain = getProperty(x, "system.effect")
            domain = typeof domain === 'object' && domain !== null ? getProperty(domain, "attributes") || "" : ""
            const price = Number(getProperty(x, "system.price")) || 0
            if (domain != "" || price > 10000) return false

            let seeName = `${x.type}_${x.name}`
            return (seen.hasOwnProperty(seeName) ? false : (seen[seeName] = true)) && actor.items.filter(function(y) {
                return y.type == x.type && y.name == x.name
            }).length == 0
        })
        await actor.createEmbeddedDocuments("Item", items)
        $(ev.currentTarget).text(text)
    }

    async removeAllGoods(actor, ev) {
        let text = $(ev.currentTarget).text()
        $(ev.currentTarget).html(' <i class="fa fa-spin fa-spinner"></i>')
        let ids = actor.items.filter(x => DSK.equipmentCategories.has(x.type) && !getProperty(x, "worn.value")).map(x => x.id)
        await actor.deleteEmbeddedDocuments("Item", ids);
        $(ev.currentTarget).text(text)
    }

    async transferItem(source, target, data, buy = true) {
        let itemId
        let price
        let amount

        if (data?.currentTarget) {
            itemId = this._getItemId(data);
            price = $(data.currentTarget).attr("data-price")
            amount = data.ctrlKey ? 10 : 1
        } else {
            itemId = data?.itemId
            price = data?.price
            amount = data?.amount || 1
        }

        if (game.user.isGM) {
            await this.constructor.finishTransaction(source, target, price, itemId, buy, amount)
        } else if (this.constructor.noNeedToPay(target, source, price) || DSKPayment.canPay(target, price, true)) {
            game.socket.emit("system.dsk", {
                type: "trade",
                payload: {
                    target: this.constructor.transferTokenData(target),
                    source: this.constructor.transferTokenData(source),
                    price,
                    itemId,
                    buy,
                    amount
                }
            })
        }
    }

    static transferTokenData(tokenData) {
        let id = { actor: tokenData.id }
        if (tokenData.token)
            id["token"] = tokenData.token.id

        return id
    }

    static getItemPrice(item) {
        return Number(getProperty(item, "flags.dsk.customPriceTag")) || (item.type == "consumable" ? game.dsk.config.ItemSubClasses.consumable.consumablePrice(item) : Number(item.system.price))
    }

    static async finishTransaction(source, target, price, itemId, buy, amount) {
        const sourceItem = source.items.get(itemId)
        if (!sourceItem) return

        const item = sourceItem.toObject()
        if (Number(item.system.quantity) > 0) {
            amount = Math.min(Number(item.system.quantity), amount)
            let totalPrice = Number(price) * amount
            const isBagWithContents = item.type == "equipment" && getProperty(item, "system.category") == "bags" && source.items.some((i) => i.system.parent_id == itemId)

            if (isBagWithContents && !this.noNeedToPay(target, source, `${totalPrice}`)) {
                const children = fetchBagItems(sourceItem, source)
                for (const child of children) {
                    totalPrice += this.getItemPrice(child) * (child.system.quantity || 1)
                }
            }

            price = `${totalPrice}`
            const noNeedToPay = this.noNeedToPay(target, source, price)
            const hasPaid = noNeedToPay || DSKPayment.payMoney(target, price, true)
            if (hasPaid) {
                if (getProperty(item, "system.worn.value")) item.system.worn.value = false

                if (buy) {
                    if (isBagWithContents) {
                        await transferBagWithContents(source, target, item)
                    } else {
                        await this.updateTargetTransaction(target, item, amount, source, price)
                        await this.updateSourceTransaction(source, target, item, price, itemId, amount)
                    }
                    await this.transferNotification(item, target, source, buy, price, amount, noNeedToPay)
                    await this.selfDestruction(source)
                } else {
                    if (isBagWithContents) {
                        await transferBagWithContents(source, target, item)
                    } else {
                        await this.updateSourceTransaction(source, target, item, price, itemId, amount)
                        await this.updateTargetTransaction(target, item, amount, source, price)
                    }
                    await this.transferNotification(item, source, target, buy, price, amount, noNeedToPay)
                }
            }
        }

        if (source.sheet.rendered) source.sheet.render(true)
        if (target.sheet.rendered) target.sheet.render(true)
        game.socket.emit("system.dsk", {
            type: "refreshSheets",
            payload: {
                sheets: [
                    { id: source.id, type: "ActorSheet", sheetId: source.sheet.id },
                    { id: target.id, type: "ActorSheet", sheetId: target.sheet.id },
                ],
            },
        })
    }

    static isTemporaryToken(target) {
        return getProperty(target.system, "merchant.merchantType") == "loot" && getProperty(target.system, "merchant.temporary")
    }

    static async selfDestruction(target) {
        if (this.isTemporaryToken(target)) {
            const hasItemsLeft = target.items.some(x => DSK.equipmentCategories.has(x.type) || (x.type == "money" && x.system.quantity > 0))
            if (!hasItemsLeft) {
                game.socket.emit("system.dsk", {
                    type: "hideDeletedSheet",
                    payload: {
                        target: this.transferTokenData(target)
                    }
                })
                const tokens = target.getActiveTokens().map(x => x.id)
                await canvas.scene.deleteEmbeddedDocuments("Token", tokens)
                await game.actors.get(target.id).delete()
                this.hideDeletedSheet(target)
            }
        }
    }

    static async hideDeletedSheet(target) {
        target.sheet.close(true)
    }

    static async transferNotification(item, source, target, buy, price, amount, noNeedToPay) {
        const notify = game.settings.get("dsk", "merchantNotification")
        if (notify == 0 || getProperty(item, "system.category") == "service") return

        const notif = "dsk.MERCHANT." + (buy ? "buy" : "sell") + (noNeedToPay ? "Loot" : "") + "Notification"
        const template = game.i18n.format(notif, { item: item.name, source: source.name, target: target.name, amount, price, buy })
        const chatData = DSKUtility.chatDataSetup(template)
        if (notify == 2) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM").map(u => u.id)
        await ChatMessage.create(chatData)
    }

    static noNeedToPay(target, source, price) {
        return price == 0 || getProperty(target.system, "merchant.merchantType") == "loot" || getProperty(source.system, "merchant.merchantType") == "loot"
    }

    static async updateSourceTransaction(source, target, sourceItem, price, itemId, amount) {
        let item = duplicate(sourceItem)
        if (Number(item.system.quantity) > amount || item.type == "money") {
            item.system.quantity = Number(item.system.quantity) - amount
            await source.updateEmbeddedDocuments("Item", [item])
        } else {
            await source.deleteEmbeddedDocuments("Item", [itemId])
        }
        if (!this.noNeedToPay(source, target, price)) await DSKPayment.getMoney(source, price, true)
    }

    static async updateTargetTransaction(target, sourceItem, amount, source, price) {
        let item = duplicate(sourceItem)
        const isService = getProperty(item, "system.category") == "service"
        if (isService) {
            const msg = game.i18n.format("dsk.MERCHANT.buyNotification", { item: item.name, amount, source: target.name, target: source.name, price })
            ChatMessage.create(DSKUtility.chatDataSetup(msg));
        } else {
            let res = target.items.find(i => ItemDSK.areEquals(item, i));
            item.system.quantity = amount
            if (!res) {
                await target.createEmbeddedDocuments("Item", [item]);
            } else {
                await ItemDSK.stackItems(res, item, target)
            }
        }
    }

    getTradeFriend() {
        return this.otherTradeFriend || game.user.character
    }

    async _manageDragItems(item, typeClass) {
        switch (typeClass) {
            case "creature":
            case "npc":
            case "character":
                //TODO skip if not trading window enabled
                this.setTradeFriend(item)
                break;
            default:
                return super._manageDragItems(item, typeClass)
        }
    }

    async _onDropActor(event, item) {
        const limited = this.actor.limited;
        const owner = this.actor.isOwner;

        if (!(limited || owner)) return false;
        if (item.uuid == this.actor.uuid) return false;

        if (owner || (limited && item.documentName == "Actor")) {
            return await this._manageDragItems(item, item.type);
        }
    }

    setTradeFriend(otherTradeFriend) {
        const newTradeFriend = game.actors.get(otherTradeFriend._id)
        if (newTradeFriend.isOwner) {
            this.otherTradeFriend = newTradeFriend
            this.render(true)
        }
    }

    async render(options = {}, _options = {}) {
        if (!game.user.isGM && getProperty(this.actor.system, "merchant.merchantType") == "loot" && getProperty(this.actor.system, "merchant.locked")) {
            foundry.audio.AudioHelper.play({ src: "sounds/lock.wav", loop: false }, false);
            return
        }
        return await super.render(options, _options);
    }

    async _prepareContext(options) {
        const data = await super._prepareContext(options);
        data["merchantType"] = getProperty(this.actor.system, "merchant.merchantType") || "none"
        data["merchantTypes"] = DSK.merchantTypes
        data["invName"] = game.i18n.localize(DSK.merchantTypes[data["merchantType"]])
        data["players"] = game.users.filter(x => !x.isGM).map(x => {
            x.allowedMerchant = this.actor.testUserPermission(x, "LIMITED", false)
            x.buyingFactor = getProperty(this.actor.system, `merchant.factors.buyingFactor.${x.id}`)
            x.sellingFactor = getProperty(this.actor.system, `merchant.factors.sellingFactor.${x.id}`)
            return x
        })

        this.prepareStorage(data)
        if (data.merchantType != "epic") {
            if (this.merchantSheetActivated()) {
                this.filterWornEquipment(data)
                this.prepareTradeFriend(data)
                this.hideEmptyCategories(data.prepare.inventory)
            }
        }
        data.hasOtherTradeFriend = !!this.otherTradeFriend

        return data;
    }

    hideEmptyCategories(inventory) {
        for (const key of Object.keys(inventory)) {
            inventory[key].show = inventory[key].items.length && inventory[key].items.some(x => !x.system.tradeLocked)
        }
    }

    filterWornEquipment(data) {
        for (const [key, value] of Object.entries(data.prepare.inventory)) {
            value.items = value.items.filter(x =>  !getProperty(x, "system.worn.value"))
        }
    }

    prepareStorage(data) {
        if (data["merchantType"] == "merchant") {
            for (const [key, value] of Object.entries(data.prepare.inventory)) {
                for (const item of value.items) {
                    item.defaultPrice = this.getItemPrice(item)
                    item.calculatedPrice = Number(parseFloat(`${item.defaultPrice * (getProperty(this.actor.system, "merchant.sellingFactor") || 1)}`).toFixed(2)) * (getProperty(this.actor.system, `merchant.factors.sellingFactor.${game.user.id}`) || 1)
                    item.priceTag = ` / ${item.calculatedPrice}`
                }
            }
        } else if (data["merchantType"] == "loot") {
            for (const [key, value] of Object.entries(data.prepare.inventory)) {
                for (const item of value.items) {
                    item.calculatedPrice = this.getItemPrice(item)
                }
            }
        }
    }

    getItemPrice(item) {
        return Number(getProperty(item, "flags.dsk.customPriceTag")) || (item.type == "consumable" ? game.dsk.config.ItemSubClasses.consumable.consumablePrice(item) : Number(item.system.price))
    }

    prepareTradeFriend(data) {
        let friend = this.getTradeFriend()
        if (friend) {
            let tradeData = friend.prepareItems({ details: [] })
            let factor = getProperty(this.actor.system, "merchant.merchantType") == "loot" ? 1 : (getProperty(this.actor.system, "merchant.buyingFactor") || 1) * (getProperty(this.actor.system, `merchant.factors.buyingFactor.${game.user.id}`) || 1)
            let inventory = this.prepareSellPrices(tradeData.inventory, factor)
            this.hideEmptyCategories(inventory)

            mergeObject(data, {
                tradeFriend: {
                    img: friend.img,
                    name: friend.name,
                    inventory,
                    money: friend.system.money
                }
            })
        } else {
            mergeObject(data, {
                tradeFriend: {
                    inventory: [],
                    money: ""
                }
            })
        }
    }

    prepareSellPrices(inventory, factor) {
        for (const [key, value] of Object.entries(inventory)) {
            for (const item of value.items) {
                item.calculatedPrice = Number(parseFloat(`${this.getItemPrice(item) * factor}`).toFixed(2))
            }
        }
        return inventory
    }
    }
};

class SelectTradefriendDialog extends DefaultAppv2 {
    static DEFAULT_OPTIONS = {
        window: {
            title: 'dsk.DIALOG.setTargetToUser',
            resizable: true,
        },
        position: {
            width: 400,
        },
        actions: {
            select: this.setTargetToUser,
        },
    };

    static PARTS = {
        main: {
            template: 'systems/dsk/templates/dialog/selectTradeFriend.hbs',
        },
    };

    static async getDialog(actor) {
        const users = await game.dsk.apps.gameMasterMenu?.getTrackedHeros();

        if (!users) return ui.notifications.warn("The required functionality is not yet available.");

        const dialog = new SelectTradefriendDialog();
        dialog.actor = actor;
        return dialog;
    }

    async _prepareContext(_options) {
        const data = await super._prepareContext(_options);
        data.users = await game.dsk.apps.gameMasterMenu?.getTrackedHeros();
        return data;
    }

    static setTargetToUser(ev, target) {
        this.actor.setTradeFriend({ _id: target.dataset.id });
        this.close();
    }
}