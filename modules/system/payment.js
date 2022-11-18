import DSKSoundEffect from "./dsk-soundeffect.js"
import DSKUtility from "./dsk_utility.js"

export default class DSKPayment {
    static payMoney(actor, moneyString, silent = false) {
        let canPay = DSKPayment.canPay(actor, moneyString, silent)
        if (canPay.success)
            DSKPayment._updateMoney(actor, canPay.actorsMoney.sum - canPay.money)

        if (!silent && canPay.msg != "")
            ChatMessage.create(DSKUtility.chatDataSetup(`<p>${canPay.msg}</p>`, "roll"))

        return canPay.success
    }

    static canPay(actor, moneyString, silent) {
        let money = this._getPaymoney(moneyString)
        let result = { success: false, msg: "", money: money }

        if (money) {
            result.actorsMoney = this._actorsMoney(actor)
            if (result.actorsMoney.sum >= money) {
                result.msg = game.i18n.format("dsk.PAYMENT.pay", { actor: actor.name, amount: DSKPayment._moneyToString(money) })
                result.success = true
            } else {
                result.msg = game.i18n.format("dsk.PAYMENT.cannotpay", { actor: actor.name, amount: DSKPayment._moneyToString(money) })
                if (silent) {
                    ui.notifications.notify(result.msg)
                }
            }
        }
        return result
    }

    static getMoney(actor, moneyString, silent = false) {
        let money = this._getPaidmoney(moneyString)

        if (money) {
            let actorsMoney = this._actorsMoney(actor)
            DSKPayment._updateMoney(actor, actorsMoney.sum + money)
            let msg = `<p>${game.i18n.format("dsk.PAYMENT.getPaid", {actor: actor.name, amount: DSKPayment._moneyToString(money)})}</p>`
            if (!silent) {
                ChatMessage.create(DSKUtility.chatDataSetup(msg, "roll"))
            }
            return true
        }
    }

    static _updateMoney(actor, newSum) {
        let coins = DSKPayment._moneyToCoins(newSum)

        actor.update({"system.money": coins})
    }

    static createGetPaidChatMessage(moneyString, whisper = undefined) {
        let money = this._getPaidmoney(moneyString)

        if (money) {
            const whisp = whisper ? ` (${whisper})` : ""
            let msg = `<p><b>${game.i18n.localize("dsk.PAYMENT.wage")}</b></p><p>${game.i18n.format("dsk.PAYMENT.getPaidSum", { amount: DSKPayment._moneyToString(money) })}${whisp}</p><button class="payButton" data-pay="1" data-amount="${money}">${game.i18n.localize("dsk.PAYMENT.getPaidButton")}</button>`
            ChatMessage.create(DSKUtility.chatDataSetup(msg, "roll"))
        }
    }

    static createPayChatMessage(moneyString, whisper = undefined) {
        let money = this._getPaymoney(moneyString)

        if (money) {
            const whisp = whisper ? ` (${whisper})` : ""
            let msg = `<p><b>${game.i18n.localize("dsk.PAYMENT.bill")}</b></p>${game.i18n.format("dsk.PAYMENT.paySum", { amount: DSKPayment._moneyToString(money) })}${whisp}</p><button class="payButton" data-pay="0" data-amount="${money}">${game.i18n.localize("dsk.PAYMENT.payButton")}</button>`
            ChatMessage.create(DSKUtility.chatDataSetup(msg, "roll"))
        }
    }

    static _getPaidmoney(moneyString) {
        let money = this._parseMoneyString(moneyString)

        if (!money) {
            let msg = `<p><b>${game.i18n.localize("dsk.PAYMENT.error")}</b></p><p><i>${game.i18n.localize("dsk.PAYMENT.getPaidexample")}</i></p>`;
            ChatMessage.create(DSKUtility.chatDataSetup(msg, "roll"));
            return false
        }
        return money
    }

    static _getPaymoney(moneyString) {
        let money = this._parseMoneyString(moneyString)

        if (!money) {
            let msg = `<p><b>${game.i18n.localize("dsk.PAYMENT.error")}</b></p><p><i>${game.i18n.localize("dsk.PAYMENT.payexample")}</i></p>`;
            ChatMessage.create(DSKUtility.chatDataSetup(msg, "roll"));
            return false
        }
        return money
    }

    static _parseMoneyString(moneyString) {
        let match = moneyString.replace(",", ".").match(/\d{1,}(\.\d{1,3}|,\d{1,3})?/)
        if (match) {
            return Number(match[0])
        } else {
            return false
        }
    }

    static _actorsMoney(actor) {
        return {
            sum: actor.system.money
        }
    }

    static handlePayAction(elem, pay, amount, actor = undefined) {
        if (game.user.isGM && !actor) {
            ui.notifications.notify(game.i18n.localize("dsk.PAYMENT.onlyActors"))
            return
        }
        if (actor) DSKSoundEffect.playMoneySound(true)
        else actor = game.user.character

        let result = false
        if (actor && pay) {
            result = DSKPayment.payMoney(actor, amount)
        } else if (actor && !pay) {
            result = DSKPayment.getMoney(actor, amount)
        } else {
            ui.notifications.notify(game.i18n.localize("dsk.PAYMENT.onlyActors"))
        }
        if (result && elem) {
            elem.fadeOut()
            game.socket.emit("system.dsk", {
                type: "updateMsg",
                payload: {
                    id: elem.closest(".message").attr("data-message-id"),
                    updateData: {
                        [`flags.dsk.userHidden.${game.user.id}`]: true
                    }
                }
            })
        }
    }

    static _moneyToCoins(money) {
        return money
    }

    static _moneyToString(money) {
        let coins = DSKPayment._moneyToCoins(money)        
        return `<span class="nobr">${coins} <span data-tooltip="dsk.money" class="chatmoney" style="background-size:contain;background-image:url('systems/dsk/icons/categories/money.webp');"></span></span>`
    }

    static async chatListeners(html) {
        html.on('click', '.payButton', ev => {
            const elem = $(ev.currentTarget)
            DSKPayment.handlePayAction(elem, Number(elem.attr("data-pay")) != 1, elem.attr("data-amount"))
            DSKSoundEffect.playMoneySound()
        })
    }
}