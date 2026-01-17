import { DefaultAppv2 } from "./baseapp.js";
import ItemDSK from "../item/item_dsk.js";
import DSK from "../system/config.js";
import DSKSoundEffect from "../system/dsk-soundeffect.js";
import DSKUtility from "../system/dsk_utility.js";
import DSKPayment from "../system/payment.js";
import RuleChaos from "../system/rule_chaos.js";
const { mergeObject, getProperty, duplicate } = foundry.utils
const { renderTemplate } = foundry.applications.handlebars;
//todo add on use button to merchant sheet

export const MerchantSheetMixin = (superclass) => class extends superclass {
    static DEFAULT_OPTIONS = {
        classes: ['merchant-sheet'],
        actions: {
            ...superclass.DEFAULT_OPTIONS?.actions,
            allowMerchant: this._allowMerchant,
            toggleAllAllowMerchant: this._toggleAllAllowMerchant,
            lockTradeSection: this._lockTradeSection,
            tradeLock: this._tradeLock,
            randomGoods: this._randomGoods,
            clearInventory: this._clearInventory,
            removeOtherTradeFriend: this._removeOtherTradeFriend,
            choseTradefriend: this._choseTradefriend,
            setCustomPrice: this._setCustomPrice,
            buyItem: this._buyItem,
            sellItem: this._sellItem,
            externalEdit: this._externalEdit,
            changeAmountAllItems: { handler: this._changeAmountAllItems, buttons: [0, 2] },
        },
        majorButtons: [
            ...(superclass.DEFAULT_OPTIONS?.majorButtons || []),
            {
                action: 'playerview',
                icon: function () {
                    return `fas fa-toggle-${getProperty(this.actor.system, "merchant.playerView") ? 'on' : 'off'}`;
                },
                label: 'dsk.SHEET.switchLimited',
                visible: function () {
                    return this.actor.isOwner;
                },
            },
        ],
    };

    static get merchantTemplate() {
        return "systems/dsk/templates/actors/merchant/merchant-sheet.hbs";
    }

    get template() {
        if (this.merchantSheetActivated()) {
            switch (getProperty(this.actor.system, "merchant.merchantType")) {
                case "merchant":
                    return "systems/dsk/templates/actors/merchant/merchant-limited.hbs";
                case "loot":
                    return "systems/dsk/templates/actors/merchant/merchant-limited-loot.hbs";
                case "epic":
                    return "systems/dsk/templates/actors/merchant/merchant-epic.hbs";
                default:
                    return super.template
            }
        }

        return this.constructor.merchantTemplate
    }

    merchantSheetActivated() {
        return this.showLimited() || (this.playerViewEnabled() && ["merchant", "loot", "epic"].includes(getProperty(this.actor.system, "merchant.merchantType")))
    }

    async allowMerchant(ids, allow) {
        let curPermissions = duplicate(this.actor.ownership)
        const newPerm = allow ? 1 : 0
        for (const id of ids) {
            curPermissions[id] = newPerm
        }
        await this.actor.update({ ownership: curPermissions }, { diff: false, recursive: false, noHook: true })
    }

    _onRender(context, options) {
        super._onRender(context, options);
        const html = $(this.element);
        html.find('.customPriceTag').on('change', async (ev) => this._handleCustomPriceChange(ev))
            .on('blur', (ev) => $(ev.currentTarget).closest('.setCustomPrice').removeClass("edit"));
        html.find('.gearSearch').prop("disabled", false);
    }

    // Static action handlers for AppV2
    static async _allowMerchant(ev, target) {
        const id = target.dataset.userId;
        const i = $(target).find('i');
        await this.allowMerchant([id], !(i.hasClass("fa-check-circle")));
        i.toggleClass("fa-circle fa-check-circle");
    }

    static async _toggleAllAllowMerchant(ev, target) {
        const ids = game.users.filter(x => !x.isGM).map(x => x.id);
        const allow = target.dataset.lock == "true";
        await this.allowMerchant(ids, allow);
        this.render();
    }

    static _lockTradeSection(ev, target) {
        this.lockTradeSection(ev);
    }

    static _tradeLock(ev, target) {
        this.toggleTradeLock(ev);
    }

    static _randomGoods(ev, target) {
        this.randomGoods(ev);
    }

    static _clearInventory(ev, target) {
        this.clearInventory(ev);
    }

    static _removeOtherTradeFriend(ev, target) {
        this.removeOtherTradeFriend();
    }

    static _choseTradefriend(ev, target) {
        this.choseTradefriend();
    }

    static _setCustomPrice(ev, target) {
        $(target).addClass("edit");
    }

    static _buyItem(ev, target) {
        this.advanceWrapper(ev, "buyItem", ev);
        DSKSoundEffect.playMoneySound();
    }

    static _sellItem(ev, target) {
        this.advanceWrapper(ev, "sellItem", ev);
        DSKSoundEffect.playMoneySound();
    }

    static _externalEdit(ev, target) {
        ev.preventDefault();
        let itemId = this._getItemId(ev);
        const item = this.getTradeFriend().items.get(itemId);
        item.sheet.render(true);
    }

    static _changeAmountAllItems(ev, target) {
        this.changeAmountAllItems(ev);
    }

    async _handleCustomPriceChange(ev) {
        await this.setCustomPrice(ev);
    }

    _canDragStart(selector) {
        return !this.merchantSheetActivated() && this.isEditable;
    }

    async toggleTradeLock(ev) {
        const itemId = this._getItemId(ev);
        let item = this.actor.items.get(itemId)
        this.actor.updateEmbeddedDocuments("Item", [{ _id: item.id, "system.tradeLocked": !item.system.tradeLocked }]);
    }

    async setCustomPrice(ev) {
        ev.stopPropagation()
        ev.preventDefault()
        const itemId = this._getItemId(ev);

        await this.actor.updateEmbeddedDocuments("Item", [{ _id: itemId, "flags.dsk.customPriceTag": Number(ev.target.value) }])
    }

    removeOtherTradeFriend() {
        this.otherTradeFriend = undefined
        this.render(true)
    }

    async choseTradefriend(){
        (await SelectTradefriendDialog.getDialog(this)).render(true)
    }

    async lockTradeSection(ev) {
        const updates = []
        const rule = this.filterRule(ev)
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

    filterRule(ev) {
        const filter = ev.currentTarget.dataset.type
        if (DSK.equipmentTypes[filter]) {
            return (item) => { return item.type == "equipment" && item.system.category == filter }
        } else {
            return (item) => { return item.type == filter && DSK.equipmentCategories.includes(item.type) }
        }
    }

    async changeAmountAllItems(ev) {
        const updates = []
        const rule = this.filterRule(ev)
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
        return getProperty(this.actor.system, "merchant.playerView")
    }

    async buyItem(ev) {
        await this.transferItem(this.actor, this.getTradeFriend(), ev, true)
    }
    async sellItem(ev) {
        await this.transferItem(this.getTradeFriend(), this.actor, ev, false)
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
        let ids = actor.items.filter(x => DSK.equipmentCategories.includes(x.type) && !getProperty(x, "worn.value")).map(x => x.id)
        await actor.deleteEmbeddedDocuments("Item", ids);
        $(ev.currentTarget).text(text)
    }

    async transferItem(source, target, ev, buy = true) {
        let itemId = this._getItemId(ev);
        let price = $(ev.currentTarget).attr("data-price")
        let amount = ev.ctrlKey ? 10 : 1

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

    static async finishTransaction(source, target, price, itemId, buy, amount) {
        const item = source.items.get(itemId).toObject()
        if (Number(item.system.quantity) > 0) {
            amount = Math.min(Number(item.system.quantity), amount)
            price = `${Number(price) * amount}`
            const noNeedToPay = this.noNeedToPay(target, source, price)
            const hasPaid = noNeedToPay || DSKPayment.payMoney(target, price, true)
            if (hasPaid) {
                if (getProperty(item, "system.worn.value")) item.system.worn.value = false

                if (buy) {
                    await this.updateTargetTransaction(target, item, amount, source, price)
                    await this.updateSourceTransaction(source, target, item, price, itemId, amount)
                    await this.transferNotification(item, target, source, buy, price, amount, noNeedToPay)
                    await this.selfDestruction(source)
                } else {
                    await this.updateSourceTransaction(source, target, item, price, itemId, amount)
                    await this.updateTargetTransaction(target, item, amount, source, price)
                    await this.transferNotification(item, source, target, buy, price, amount, noNeedToPay)
                }
            }
        }
    }

    static isTemporaryToken(target) {
        return getProperty(target.system, "merchant.merchantType") == "loot" && getProperty(target.system, "merchant.temporary")
    }

    static async selfDestruction(target) {
        if (this.isTemporaryToken(target)) {
            const hasItemsLeft = target.items.some(x => DSK.equipmentCategories.includes(x.type) || (x.type == "money" && x.system.quantity > 0))
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

        if (data.merchantType != "epic") {
            this.prepareStorage(data)
            if (this.merchantSheetActivated()) {
                this.filterWornEquipment(data)
                this.prepareTradeFriend(data)
                if (data.prepare.inventory["misc"].items.length == 0) data.prepare.inventory["misc"].show = false
            }
        } else {
            this.prepareStorage(data)
        }
        data.hasOtherTradeFriend = !!this.otherTradeFriend

        return data;
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
            if (inventory["misc"].items.length == 0) inventory["misc"].show = false

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

class SelectTradefriendDialog extends DefaultAppv2 {
    static DEFAULT_OPTIONS = {
        window: { title: 'dsk.DIALOG.setTargetToUser' },
    };

    static PARTS = {
        main: {
            template: 'systems/dsk/templates/dialog/selectTradeFriend.hbs',
        },
    };

    constructor(actor) {
        super();
        this.actor = actor;
    }

    static async getDialog(actor) {
        const users = await game.dsk.apps.gameMasterMenu?.getTrackedHeros();

        if (!users) return ui.notifications.warn("The required functionality is not yet available.");

        return new SelectTradefriendDialog(actor);
    }

    async _prepareContext(_options) {
        const data = await super._prepareContext(_options);
        data.users = await game.dsk.apps.gameMasterMenu?.getTrackedHeros();
        return data;
    }

    async _onRender(context, options) {
        await super._onRender(context, options);

        const html = $(this.element);
        html.find('.combatant').on('click', ev => this.setTargetToUser(ev));
    }

    setTargetToUser(ev) {
        this.actor.setTradeFriend({ _id: ev.currentTarget.dataset.id });
        this.close();
    }
}