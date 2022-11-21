import DiceDSK from "./dicedsk.js";
import DSKUtility from "./dsk_utility.js";

export default class OpposedDSK{
    static async handleOpposedTarget(message) {
        if (!message) return;

        let actor = DSKUtility.getSpeaker(message.speaker)
        if (!actor) return

        let testResult = message.flags.data.postData
        let preData = message.flags.data.preData

        if (game.user.targets.size && message.flags.data.isOpposedTest && !message.flags.data.defenderMessage && !message.flags.data.attackerMessage) {
            console.log("start opposed")
            OpposedDSK.createOpposedTest(actor, message, testResult, preData)
        } 
        await this.showDamage(message)
        await this.showSpellWithoutTarget(message)
    }

    static async createOpposedTest(actor, message, testResult, preData) {
        let attacker;

        if (message.speaker.token)
            attacker = canvas.tokens.get(message.speaker.token).document
        else
            attacker = actor.prototypeToken

        if (testResult.successLevel > 0) {
            game.user.targets.forEach(async target => {
                if (target.actor) {
                    const content = OpposedDSK.opposeMessage(attacker, target, false)
                    await ChatMessage.create({
                        user: game.user.id,
                        content,
                        speaker: message.speaker,
                        ["flags.unopposeData"]: {
                            attackMessageId: message.id,
                            targetSpeaker: {
                                scene: target.scene.id,
                                token: target.id,
                                alias: target.document.name
                            }
                        }
                    })
                }
            })
        } else {
            game.user.targets.forEach(async target => {
                if (target.actor) {
                    await ChatMessage.create({
                        user: game.user.id,
                        content: OpposedDSK.opposeMessage(attacker, target, true),
                        speaker: message.speaker
                    })
                }
            })
        }
    }

    static opposeMessage(attacker, target, fail) {
        return `<div class ="opposed-message">
            <b>${attacker.name}</b> ${game.i18n.localize("dsk.ROLL.Targeting")} <b>${target.document.name}</b> ${fail ? game.i18n.localize("dsk.ROLL.failed"): ""}
            </div>
            <div class = "opposed-tokens row-section">
                <div class="col two attacker">${OpposedDSK.videoOrImgTag(attacker.texture.src)}</div>
                <div class="col two defender">${OpposedDSK.videoOrImgTag(target.document.texture.src)}</div>
            </div>
             `
    }

    static videoOrImgTag(path) {
        if (/\.webm$/.test(path)) {
            return `<video loop autoplay src="${path}" width="50" height="50"></video>`
        }
        return `<img src="${path}" width="50" height="50"/>`
    }

    static async showDamage(message, hide = false) {
        if (game.user.isGM) {
            if ((!hide || !message.flags.data.hideDamage) && message.flags.data.postData.damageRoll) {
                await message.update({
                    "content": message.content.replace(`data-hide-damage="${!hide}"`, `data-hide-damage="${hide}"`),
                    "flags.data.hideDamage": hide
                });
                if (!hide) DiceDSK._addRollDiceSoNice(message.flags.data.preData, Roll.fromData(message.flags.data.postData.damageRoll), game.dsk.apps.DiceSoNiceCustomization.getAttributeConfiguration("damage"))
            }
        } else {
            game.socket.emit("system.dsk", {
                type: "showDamage",
                payload: {
                    id: message.id,
                    hide: hide
                }
            })
        }
    }

    static async showSpellWithoutTarget(message) {
        if (DSKUtility.moduleEnabled("autoanimations")) {
            const msgData = getProperty(message, "flags.data")
            if (!msgData || msgData.isOpposedTest) return

            const result = getProperty(msgData, "postData.result") || -1
            if (result > 0) {
                const attackerToken = DSKUtility.getSpeaker(msgData.postData.speaker).getActiveTokens()[0]
                if (!attackerToken || !attackerToken.actor) return

                let targets = Array.from(game.user.targets)
                const item = attackerToken.actor.items.get(msgData.preData.source._id)
                if (!targets.length) targets = [attackerToken]

                AutomatedAnimations.playAnimation(attackerToken, item, { targets })
            }
        }
    }
}