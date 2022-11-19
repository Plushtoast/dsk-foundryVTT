import DSKPayment from '../system/payment.js'
import DiceDSK from '../system/dicedsk.js';
import DSKChatAutoCompletion from '../system/chat_autocompletion.js';
import DSKChatListeners from '../system/chat_listeners.js';
import DSKUtility from '../system/dsk_utility.js';
import DSKStatusEffects from '../status/status_effects.js';
import DialogReactDSK from '../dialog/dialog-react.js';

export function initChatlogHooks() {
    Hooks.on('renderChatLog', (log, html, data) => {
        DiceDSK.chatListeners(html)
        DSKPayment.chatListeners(html)
        const autoComplete = new DSKChatAutoCompletion()
        Hooks.call("startDSKChatAutoCompletion", autoComplete)
        autoComplete.chatListeners(html)
        DSKChatListeners.chatListeners(html)
    });

    Hooks.on("renderChatMessage", (app, html, msg) => {
        if (!game.user.isGM) {
            html.find(".chat-button-gm").remove();
            let actor
            const reaction = html.find(".chat-button-target")
            if (reaction.length) {
                actor = DialogReactDSK.getTargetActor(msg.message)
                if (actor && actor.actor && !actor.actor.isOwner) reaction.remove()
            }

            const speaker = DSKUtility.getSpeaker(msg.message.speaker)
            if (speaker && !speaker.isOwner) {
                html.find(".selfButton").remove()
                html.find('.d20').data('tooltip', '')
            }

            const onlyTarget = html.find(".onlyTarget")
            if (onlyTarget.length) {
                actor = DSKUtility.getSpeaker({
                    token: onlyTarget.attr("data-token"),
                    actor: onlyTarget.attr("data-actor"),
                    scene: canvas.scene ? canvas.scene.id : null
                })
                if (actor && !actor.isOwner) onlyTarget.remove()
            }

            html.find(".hideData").remove()
            const hiddenForMe = getProperty(msg.message, `flags.dsk.userHidden.${game.user.id}`)
            if (hiddenForMe) { html.find(".payButton").remove() }
        }else{
            html.find(".chat-button-player").remove()
        }
        if (game.settings.get("dsk", "expandChatModifierlist")) {
            html.find('.expand-mods i').toggleClass("fa-minus fa-plus")
            html.find('.expand-mods + ul').css({ "display": "block" })
        }
        DSKStatusEffects.bindButtons(html)
    });

    Hooks.on("chatMessage", (html, content, msg) => {
        let cmd = content.match(/^\/(pay|getPaid|help$|conditions$|tables)/)
        cmd = cmd ? cmd[0] : ""
        switch (cmd) {
            case "/pay":
                if (game.user.isGM)
                    DSKPayment.createPayChatMessage(content)
                else
                    DSKPayment.payMoney(DSKUtility.getSpeaker(msg.speaker), content)
                return false
            case "/getPaid":
                if (game.user.isGM)
                    DSKPayment.createGetPaidChatMessage(content)
                else
                    DSKPayment.getMoney(DSKUtility.getSpeaker(msg.speaker), content)
                return false
            case "/help":
                DSKChatListeners.getHelp()
                return false
            case "/conditions":
                DSKChatListeners.showConditions()
                return false
            case "/tables":
                DSKChatListeners.showTables()
                return false
        }
    })
}