import ActorDSK from "../actor/actor_dsk.js";
import DSKUtility from "../system/dsk_utility.js";
const { getProperty } = foundry.utils

export function initChatContext() {
    const fateAvailable = (actor, group) => { return DSKUtility.fateAvailable(actor, group) }
    const canHurt = function (li, prop = 'damage.value') {
        const messageId = li.dataset.messageId;
        let cardData = game.messages.get(messageId).flags.opposeData;
        const isOwner = cardData ? DSKUtility.getSpeaker(cardData.speakerDefend)?.isOwner : false;
        return (
            ((game.user.isGM || isOwner) && li.querySelector('.opposed-card') !== null) ||
            li.querySelector('.dice-roll') !== null
        ) && (getProperty(cardData, prop) || 0) > 0;
    };

    const canHurtSP = function (li) {
        return canHurt(li, 'damage.sp');
    };

    const canCostMana = function (li) {
        let message = game.messages.get(li.dataset.messageId);
        if (message.speaker.actor && message.flags.data) {
            let actor = game.actors.get(message.speaker.actor);
            if (actor.isOwner || game.user.isGM) {
                return ["ahnengabe"].includes(message.flags.data.preData.source.type) || getProperty(message.flags.data.preData, "calculatedSpellModifiers.costsMana")
            }
        }
        return false
    }

    const canUnhideData = function (li) {
        if (game.user.isGM && game.settings.get("dsk", "hideOpposedDamage")) {
            let message = game.messages.get(li.dataset.messageId);
            return "hideData" in message.flags && message.flags.hideData
        }
        return false
    }

    const canHideData = function (li) {
        if (game.user.isGM && game.settings.get("dsk", "hideOpposedDamage")) {
            let message = game.messages.get(li.dataset.messageId);
            return "hideData" in message.flags && !message.flags.hideData
        }
        return false
    }

    const isTalented = function (li) {
        let message = game.messages.get(li.dataset.messageId);
        if (message.speaker.actor && message.flags.data) {
            let actor = game.actors.get(message.speaker.actor);
            if (actor.isOwner) {
                return actor.items.find(x => x.name == `${game.i18n.localize('dsk.LocalizedIDs.aptitude')} (${message.flags.data.preData.source.name})`) != undefined && !message.flags.data.talentedRerollUsed;
            }
        }
        return false
    }

    const canRerollDamage = function (li, group = false) {
        let message = game.messages.get(li.dataset.messageId);
        if (message.speaker.actor && message.flags.data) {
            let actor = game.actors.get(message.speaker.actor);
            if (actor.isOwner && fateAvailable(actor, group)) {
                return message.flags.data.postData.damageRoll != undefined && !message.flags.data.fatePointDamageRerollUsed;
            }
        }
        return false
    };

    const canReroll = function (li, group = false) {
        let message = game.messages.get(li.dataset.messageId);

        if (message.speaker.actor && message.flags.data) {
            let actor = game.actors.get(message.speaker.actor);
            if (actor.isOwner && fateAvailable(actor, group)) {
                return !message.flags.data.fatePointRerollUsed && !(message.flags.data.postData.rollType == "regenerate")
            }
        }
        return false;
    };

    const canHeal = function (li) {
        let message = game.messages.get(li.dataset.messageId);
        if (message.speaker.actor && message.flags.data) {
            let actor = game.actors.get(message.speaker.actor);
            if (actor.isOwner && ["LeP", "AeP"].some(x => getProperty(message.flags, `data.postData.${x}`) != undefined)) {
                return !message.flags.data.healApplied
            }
        }
        return false
    }

    const showHideData = function (li) {
        if (game.user.isGM) {
            let message = game.messages.get(li.dataset.messageId)
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

    const canApplyDefaultRolls = (li) => {
        const message = game.messages.get(li.dataset.messageId);
        if (!message || !canvas.tokens) return false;
        return message.isRoll && message.isContentVisible && canvas.tokens.controlled.length && li.querySelector('.dice-roll');
    };

    const useFate = (li, mode, fateSource = 0) => {
        let message = game.messages.get(li.dataset.messageId);
        game.actors.get(message.speaker.actor).useFateOnRoll(message, mode, fateSource);
    }

    const applyDamage = async (li, mode) => {
        const message = game.messages.get(li.dataset.messageId)
        const cardData = message.flags.opposeData
        const defenderSpeaker = cardData.speakerDefend.speaker;
        const actor = DSKUtility.getSpeaker(defenderSpeaker)

        if (!actor.isOwner) return ui.notifications.error("dsk.DSKError.DamagePermission", { localize: true })
        await actor.applyDamage(cardData.damage[mode])
        await message.update({ "flags.data.damageApplied": true, content: message.content.replace(/hideAnchor">/, `hideAnchor"><i class="fas fa-check" style="float:right" data-tooltip="${game.i18n.localize("damageApplied")}"></i>`) })
    }

    const applyChatCardDamage = (li, mode) => {
        const message = game.messages.get(li.dataset.messageId);
        const roll = message.rolls[0];
        return Promise.all(canvas.tokens.controlled.map(token => {
            const actor = token.actor;
            const damage = mode != "sp" ? roll.total - ActorDSK.armorValue(actor).armor : roll.total
            return actor.applyDamage(Math.max(0, damage));
        }));
    }

    const payMana = async (li) => {
        let message = game.messages.get(li.dataset.messageId)
        let cardData = message.flags.data
        let actor = DSKUtility.getSpeaker(message.speaker)

        if (!actor.isOwner)
            return ui.notifications.error("dsk.DSKError.DamagePermission", { localize: true })

        const payType = (["ritual", "spell"].includes(cardData.preData.source.type) || getProperty(cardData.preData.calculatedSpellModifiers, "costsMana")) ? "AeP" : "KaP"
        const manaApplied = await actor.applyMana(cardData.preData.calculatedSpellModifiers.finalcost, payType)
        await message.update({ "flags.data.manaApplied": true, content: message.content.replace(/<span class="costCheck">/, `<span class="costCheck"><i class="fas fa-check" style="float:right"></i>`) })

    }

    Hooks.on("getChatMessageContextOptions", (html, options) => {
        options.push({
            name: "dsk.CHATCONTEXT.hideData",
            icon: '<i class="fas fa-eye"></i>',
            condition: canHideData,
            callback: (li) => { showHideData(li) }
        }, {
            name: "dsk.CHATCONTEXT.showData",
            icon: '<i class="fas fa-eye"></i>',
            condition: canUnhideData,
            callback: (li) => { showHideData(li) }
        }, {
            name: "dsk.regenerate",
            icon: '<i class="fas fa-user-plus"></i>',
            condition: canHeal,
            callback: async (li) => {
                const message = await game.messages.get(li.dataset.messageId)
                const actor = DSKUtility.getSpeaker(message.speaker)
                if (!actor.isOwner)
                    return ui.notifications.error("dsk.DSKError.DamagePermission", { localize: true })

                await message.update({ "flags.data.healApplied": true, content: message.content.replace(/<\/div>$/, '<i class="fas fa-check" style="float:right"></i></div>') });
                await actor.applyRegeneration(message.flags.data.postData.LeP, message.flags.data.postData.AeP, message.flags.data.postData.KaP)
            }
        }, {
            name: "dsk.CHATCONTEXT.ApplyMana",
            icon: '<i class="fas fa-user-minus"></i>',
            condition: canCostMana,
            callback: async (li) => { payMana(li) }
        }, {
            name: "dsk.CHATCONTEXT.ApplyDamage",
            icon: '<i class="fas fa-user-minus"></i>',
            condition: canHurt,
            callback: li => { applyDamage(li, "value") }
        }, {
            name: "dsk.CHATCONTEXT.ApplyDamageSP",
            icon: '<i class="fas fa-user-minus"></i>',
            condition: canHurtSP,
            callback: li => { applyDamage(li, "sp") }
        }, {
            name: "dsk.CHATCONTEXT.ApplyDamage",
            icon: '<i class="fas fa-user-minus"></i>',
            condition: canApplyDefaultRolls,
            callback: li => { applyChatCardDamage(li, "value") }
        }, {
            name: "dsk.CHATCONTEXT.ApplyDamageSP",
            icon: '<i class="fas fa-user-minus"></i>',
            condition: canApplyDefaultRolls,
            callback: li => { applyChatCardDamage(li, "sp") }
        }, {
            name: "dsk.CHATCONTEXT.Reroll",
            icon: '<i class="fas fa-dice"></i>',
            condition: canReroll,
            callback: li => { useFate(li, "reroll") }
        }, {
            name: "dsk.CHATCONTEXT.talentedReroll",
            icon: '<i class="fas fa-dice"></i>',
            condition: isTalented,
            callback: li => { useFate(li, "isTalented") }
        }, {
            name: "dsk.CHATCONTEXT.rerollDamage",
            icon: '<i class="fas fa-dice"></i>',
            condition: canRerollDamage,
            callback: li => { useFate(li, "rerollDamage") }
        }
        )
    })
}