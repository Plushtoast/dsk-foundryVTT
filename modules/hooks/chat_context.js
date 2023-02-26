import ActorDSK from "../actor/actor_dsk.js";
import DSKUtility from "../system/dsk_utility.js";

export function initChatContext() {
    const fateAvailable = (actor, group) => { return DSKUtility.fateAvailable(actor, group) }
    const canHurt = function(li) {
        let cardData = game.messages.get(li.attr("data-message-id")).flags.opposeData
        return (game.user.isGM && li.find(".opposed-card").length || li.find(".dice-roll").length) && (getProperty(cardData, "damage.value") || 0) > 0
    }

    const canHurtSP = function(li) {
        let cardData = game.messages.get(li.attr("data-message-id")).flags.opposeData
        return (game.user.isGM && li.find(".opposed-card").length || li.find(".dice-roll").length) && (getProperty(cardData, "damage.sp") || 0) > 0
    }

    const canCostMana = function(li) {
        let message = game.messages.get(li.attr("data-message-id"));
        if (message.speaker.actor && message.flags.data) {
            let actor = game.actors.get(message.speaker.actor);
            if (actor.isOwner || game.user.isGM) {
                return ["ahnengabe"].includes(message.flags.data.preData.source.type) || getProperty(message.flags.data.preData, "calculatedSpellModifiers.costsMana")
            }
        }
        return false
    }

    const canUnhideData = function(li) {
        if (game.user.isGM && game.settings.get("dsk", "hideOpposedDamage")) {
            let message = game.messages.get(li.attr("data-message-id"));
            return "hideData" in message.flags && message.flags.hideData
        }
        return false
    }

    const canHideData = function(li) {
        if (game.user.isGM && game.settings.get("dsk", "hideOpposedDamage")) {
            let message = game.messages.get(li.attr("data-message-id"));
            return "hideData" in message.flags && !message.flags.hideData
        }
        return false
    }

    const isTalented = function(li) {
        let message = game.messages.get(li.attr("data-message-id"));
        if (message.speaker.actor && message.flags.data) {
            let actor = game.actors.get(message.speaker.actor);
            if (actor.isOwner) {
                return actor.items.find(x => x.name == `${game.i18n.localize('dsk.LocalizedIDs.aptitude')} (${message.flags.data.preData.source.name})`) != undefined && !message.flags.data.talentedRerollUsed;
            }
        }
        return false
    }

    const canRerollDamage = function(li, group = false) {
        let message = game.messages.get(li.attr("data-message-id"));
        if (message.speaker.actor && message.flags.data) {
            let actor = game.actors.get(message.speaker.actor);
            if (actor.isOwner && fateAvailable(actor, group)) {
                return message.flags.data.postData.damageRoll != undefined && !message.flags.data.fatePointDamageRerollUsed;
            }
        }
        return false
    };

    const canReroll = function(li, group = false) {
        let message = game.messages.get(li.attr("data-message-id"));

        if (message.speaker.actor && message.flags.data) {
            let actor = game.actors.get(message.speaker.actor);
            if (actor.isOwner && fateAvailable(actor, group)) {
                return !message.flags.data.fatePointRerollUsed && !(message.flags.data.postData.rollType == "regenerate")
            }
        }
        return false;
    };

    const canHeal = function(li) {
        let message = game.messages.get(li.attr("data-message-id"));
        if (message.speaker.actor && message.flags.data) {
            let actor = game.actors.get(message.speaker.actor);
            if (actor.isOwner && ["LeP", "AeP"].some(x => getProperty(message.flags, `data.postData.${x}`) != undefined)) {
                return !message.flags.data.healApplied
            }
        }
        return false
    }

    const showHideData = function(li) {
        if (game.user.isGM) {
            let message = game.messages.get(li.attr("data-message-id"))
            if ("hideData" in message.flags) {
                let newHide = !message.flags.hideData
                let query = $(message.content)
                query.find('.hideAnchor')[newHide ? "addClass" : "removeClass"]("hideData")
                query = $('<div></div>').append(query)
                message.update({
                    "content": query.html(),
                    "flags.hideData": newHide
                });
            }
        }
    }

    const canApplyDefaultRolls = li => {
        const message = game.messages.get(li.data("messageId"));
        if (!message || !canvas.tokens) return false
        return message.isRoll && message.isContentVisible && canvas.tokens.controlled.length && li.find('.dice-roll').length;
    };

    const useFate = (li, mode, fateSource = 0) => {
        let message = game.messages.get(li.attr("data-message-id"));
        game.actors.get(message.speaker.actor).useFateOnRoll(message, mode, fateSource);
    }

    const applyDamage = async(li, mode) => {
        const message = game.messages.get(li.attr("data-message-id"))
        const cardData = message.flags.opposeData
        const defenderSpeaker = cardData.speakerDefend.speaker;
        const actor = DSKUtility.getSpeaker(defenderSpeaker)

        if (!actor.isOwner) return ui.notifications.error(game.i18n.localize("dsk.DSKError.DamagePermission"))
        await actor.applyDamage(cardData.damage[mode])
        await message.update({ "flags.data.damageApplied": true, content: message.content.replace(/hideAnchor">/, `hideAnchor"><i class="fas fa-check" style="float:right" data-tooltip="${game.i18n.localize("damageApplied")}"></i>`) })
    }

    const applyChatCardDamage = (li, mode) => {
        const message = game.messages.get(li.data("messageId"));
        const roll = message.rolls[0];
        return Promise.all(canvas.tokens.controlled.map(token => {
            const actor = token.actor;
            const damage = mode != "sp" ? roll.total - ActorDSK.armorValue(actor).armor : roll.total
            return actor.applyDamage(Math.max(0, damage));
        }));
    }

    const payMana = async(li) => {
        let message = game.messages.get(li.attr("data-message-id"))
        let cardData = message.flags.data
        let actor = DSKUtility.getSpeaker(message.speaker)
        if (!actor.isOwner)
            return ui.notifications.error(game.i18n.localize("dsk.DSKError.DamagePermission"))

        
        const payType = (["ritual", "spell"].includes(cardData.preData.source.type) || getProperty(cardData.preData.calculatedSpellModifiers, "costsMana")) ? "AeP" : "KaP"
        const manaApplied = await actor.applyMana(cardData.preData.calculatedSpellModifiers.finalcost, payType)
        await message.update({ "flags.data.manaApplied": true, content: message.content.replace(/<span class="costCheck">/, `<span class="costCheck"><i class="fas fa-check" style="float:right"></i>`) })

    }
 
    Hooks.on("getChatLogEntryContext", (html, options) => {
        options.push({
                name: game.i18n.localize("dsk.CHATCONTEXT.hideData"),
                icon: '<i class="fas fa-eye"></i>',
                condition: canHideData,
                callback: (li) => { showHideData(li) }
            }, {
                name: game.i18n.localize("dsk.CHATCONTEXT.showData"),
                icon: '<i class="fas fa-eye"></i>',
                condition: canUnhideData,
                callback: (li) => { showHideData(li) }
            }, {
                name: game.i18n.localize("dsk.regenerate"),
                icon: '<i class="fas fa-user-plus"></i>',
                condition: canHeal,
                callback: async(li) => {
                    const message = await game.messages.get(li.attr("data-message-id"))
                    const actor = DSKUtility.getSpeaker(message.speaker)
                    if (!actor.isOwner)
                        return ui.notifications.error(game.i18n.localize("dsk.DSKError.DamagePermission"))

                    await message.update({ "flags.data.healApplied": true, content: message.content.replace(/<\/div>$/, '<i class="fas fa-check" style="float:right"></i></div>') });
                    await actor.applyRegeneration(message.flags.data.postData.LeP, message.flags.data.postData.AeP, message.flags.data.postData.KaP)
                }
            }, {
                name: game.i18n.localize("dsk.CHATCONTEXT.ApplyMana"),
                icon: '<i class="fas fa-user-minus"></i>',
                condition: canCostMana,
                callback: async(li) => { payMana(li) }
            }, {
                name: game.i18n.localize("dsk.CHATCONTEXT.ApplyDamage"),
                icon: '<i class="fas fa-user-minus"></i>',
                condition: canHurt,
                callback: li => { applyDamage(li, "value") }
            }, {
                name: game.i18n.localize("dsk.CHATCONTEXT.ApplyDamageSP"),
                icon: '<i class="fas fa-user-minus"></i>',
                condition: canHurtSP,
                callback: li => { applyDamage(li, "sp") }
            }, {
                name: game.i18n.localize("dsk.CHATCONTEXT.ApplyDamage"),
                icon: '<i class="fas fa-user-minus"></i>',
                condition: canApplyDefaultRolls,
                callback: li => { applyChatCardDamage(li, "value") }
            }, {
                name: game.i18n.localize("dsk.CHATCONTEXT.ApplyDamageSP"),
                icon: '<i class="fas fa-user-minus"></i>',
                condition: canApplyDefaultRolls,
                callback: li => { applyChatCardDamage(li, "sp") }
            }, {
                name: game.i18n.localize("dsk.CHATCONTEXT.Reroll"),
                icon: '<i class="fas fa-dice"></i>',
                condition: canReroll,
                callback: li => { useFate(li, "reroll") }
            },  {
                name: game.i18n.localize("dsk.CHATCONTEXT.talentedReroll"),
                icon: '<i class="fas fa-dice"></i>',
                condition: isTalented,
                callback: li => { useFate(li, "isTalented") }
            },  {
                name: game.i18n.localize("dsk.CHATCONTEXT.rerollDamage"),
                icon: '<i class="fas fa-dice"></i>',
                condition: canRerollDamage,
                callback: li => { useFate(li, "rerollDamage") }
            }
        )
    })
}