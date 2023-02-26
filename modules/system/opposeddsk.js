import ActorDSK from "../actor/actor_dsk.js";
import ItemDSK from "../item/item_dsk.js";
import DSKActiveEffectConfig from "../status/active_effects.js";
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
                    switch(testResult.rollType){
                        case "weapon":
                            await OpposedDSK.evaluateAttack(actor, message, testResult, preData, attacker, target)
                            break
                        default: 
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

    static async evaluateAttack(actor, message, testResult, preData, attacker, defender){
        if(testResult.qualityStep > 0){
            testResult.source = preData.source
            const damage = OpposedDSK._calculateOpposedDamage(testResult, defender)
            const title = [
                damage.armorMod != 0 ? `${damage.armorMod + " " + game.i18n.localize('dsk.Modifier')}` : "",
                damage.armorMultiplier != 1 ? "*" + damage.armorMultiplier + " " + game.i18n.localize('dsk.Modifier') : "",
                damage.spellArmor != 0 ? `${damage.spellArmor} ${game.i18n.localize('dsk.spellArmor')}` : ""
            ].join("")
            const description = `<b>${game.i18n.localize("dsk.damage")}</b>: ${damage.damage}<i class="lighticon fa attackWeaponless" data-tooltip="Roll"></i> - <span data-tooltip="${title}">${damage.armor}</span><i class="lighticon fa fa-shield-alt" data-tooltip="protection"></i> = ${damage.sum}`
            let opposedResult = { 
                winner: "attacker",
                damage: {
                    description,
                    value: damage.sum,
                    sp: damage.damage
                }
            }
            opposedResult = OpposedDSK.formatOpposedResult(opposedResult, attacker, defender, testResult)

            await OpposedDSK.renderOpposedResult(opposedResult, {})
            await OpposedDSK.playAutomatedJBA2(opposedResult.speakerAttack, opposedResult.speakerDefend, opposedResult)
        }
    }

    static _calculateOpposedDamage(attackerTest, defender, options = {}) {
        const actor = defender.actor
        options.origin = attackerTest.source
        options.damage = attackerTest.damage

        let damage = DSKActiveEffectConfig.applyRollTransformation(actor, options, 5).options.damage
        let { wornArmor, armor } = ActorDSK.armorValue(actor, options)

        let multipliers = []
        let armorMod = 0
        const aPen = attackerTest.armorPen || []
        for (const mod of aPen) {
            if (/^\*/.test(mod)) multipliers.push(Number(mod.replace("*", "")))
            else armorMod += Number(mod)
        }
        let spellArmor = 0
        if (["ahnengabe"].includes(attackerTest.source.type)) spellArmor += actor.system.spellArmor || 0

        armor += armorMod
        const armorMultiplier = multipliers.reduce((sum, x) => { return sum * x }, 1)
        armor = Math.max(Math.round(armor * armorMultiplier), 0)
        armor += spellArmor 
       
        return {
            damage,
            armor,
            armorMod,
            spellArmor,
            armorMultiplier,
            sum: damage - armor
        }
    }

    static formatOpposedResult(opposeResult, attacker, defender, testResult) {
        let str = opposeResult.differenceSL ? "winsFP" : "wins"
        if (opposeResult.winner == "attacker") {
            opposeResult.result = game.i18n.format("dsk.OPPOSED." + str, { winner: attacker.name, loser: defender.name, SL: opposeResult.differenceSL })
            opposeResult.img = attacker.img;
        } else if (opposeResult.winner == "defender") {
            opposeResult.result = game.i18n.format("dsk.OPPOSED." + str, { winner: defender.name, loser: attacker.name, SL: opposeResult.differenceSL })
            opposeResult.img = defender.img
        }

        opposeResult.speakerAttack = OpposedDSK.tokenDude(attacker, testResult)
        opposeResult.speakerDefend = OpposedDSK.tokenDude(defender, {})

        return opposeResult;
    }

    static tokenDude(token, testResult) {
        const res = {
            speaker: { token: token.id, actor: token.actor?.id, scene: canvas.scene?.id },
            img: OpposedDSK.videoOrImgTag(token.document?.texture.src || token.texture.src),
            testResult         
        }

        return res
    }

    static async renderOpposedResult(formattedOpposeResult, options = {}) {
        formattedOpposeResult.hideData = await game.settings.get("dsk", "hideOpposedDamage");
        let html = await renderTemplate("systems/dsk/templates/chat/roll/opposed-result.html", formattedOpposeResult)
        let chatOptions = {
            user: game.user.id,
            content: html,
            "flags.opposeData": formattedOpposeResult,
            "flags.hideData": formattedOpposeResult.hideData,
            whisper: options.whisper,
            blind: options.blind
        }
        await ChatMessage.create(chatOptions)
    }

    static opposeMessage(attacker, target, fail) {
        return `<div class="opposed-message">
            <b>${attacker.name}</b> ${game.i18n.localize("dsk.ROLL.Targeting")} <b>${target.document.name}</b> ${fail ? game.i18n.localize("dsk.ROLL.failed"): ""}
            </div>
            <div class="opposed-tokens row-section">
                <div class="col two attacker">${OpposedDSK.videoOrImgTag(attacker.texture.src)}</div>
                <div class="col two defender">${OpposedDSK.videoOrImgTag(target.document.texture.src)}</div>
            </div>
             `
    }

    static async playAutomatedJBA2(attacker, defender, opposedResult) {
        if (DSKUtility.moduleEnabled("autoanimations")) {
            //const attackerToken = canvas.tokens.get(attacker.speaker.token)
            const attackerToken = DSKUtility.getSpeaker(attacker.speaker).getActiveTokens()[0]
            const defenderToken = DSKUtility.getSpeaker(defender.speaker).getActiveTokens()[0]
            if (!attackerToken || !attackerToken.actor || !defenderToken || !defenderToken.actor) {
                return
            }
            let item = attackerToken.actor.items.get(attacker.testResult.source._id)
            if (!item) item = new ItemDSK(attacker.testResult.source, { temporary: true })
            if (!item) return

            const targets = [defenderToken]
            const hitTargets = opposedResult.winner == "attacker" ? targets : []

            AutomatedAnimations.playAnimation(attackerToken, item, { targets, hitTargets, playOnMiss: true })
        }
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