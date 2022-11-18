import ItemDSK from "../item/item_dsk.js"
import DidYouKnow from "../system/didyouknow.js"
import DSKUtility from "../system/dsk_utility.js"
import DSKTutorial from "../system/tutorial.js"
import { dropToGround } from "./itemDrop.js"
import { setEnrichers } from "./texteditor.js"
import DSKIniTracker from "../system/dsk-ini-tracker.js"
import OpposedDSK from "../system/opposeddsk.js"
import TokenHotbar2 from "../system/tokenHotbar2.js"
import MerchantSheetDSK from "../actor/merchant-sheet.js"
import OnUseEffect from "../system/onUseEffects.js"
import DSKActiveEffectConfig from "../status/active_effects.js"

export function initReady(){
    Hooks.once("ready", async() => {
        game.socket.on("system.dsk", data => {
            switch (data.type) {
                case "hideDeletedSheet":
                    let target = data.payload.target.token ? game.actors.tokens[data.payload.target.token] : game.actors.get(data.payload.target.actor)
                    MerchantSheetDSK.hideDeletedSheet(target)
                    break
            }
        })
        if(game.user.isGM){
            game.socket.on("system.dsk", data => {
                switch(data.type){
                    case "target":
                        {
                            let scene = game.scenes.get(data.payload.scene)
                            let token = new Token(scene.getEmbeddedDocument("Token", data.payload.target))
                            token.actor.update({
                                "flags.oppose": data.payload.opposeFlag
                            })
                        }
                        break
                    case "addEffect":
                        DSKActiveEffectConfig.applyEffect(data.payload.id, data.payload.mode, data.payload.actors)
                        break
                    case "updateDefenseCount":
                        if (game.combat) game.combat.updateDefenseCount(data.payload.speaker)
                        break
                    case "updateMsg":
                        game.messages.get(data.payload.id).update(data.payload.updateData)
                        break
                    case "deleteMsg":
                        game.messages.get(data.payload.id).delete()
                        break
                    case "showDamage":
                        OpposedDSK.showDamage(game.messages.get(data.payload.id), data.payload.hide)
                        break
                    case "updateGroupCheck":
                        RequestRoll.rerenderGC(game.messages.get(data.payload.messageId), data.payload.data)
                        break
                    case "updateAttackMessage":
                        game.messages.get(data.payload.messageId).update({ "flags.data.unopposedStartMessage": data.payload.startMessageId });
                        break
                    case "clearCombat":
                        if (game.combat) game.combat.nextRound()
                        break
                    case "updateDefenseCount":
                        if (game.combat) game.combat.updateDefenseCount(data.payload.speaker)
                        break
                    case "trade":
                        {
                            let source = data.payload.source.token ? game.actors.tokens[data.payload.source.token] : game.actors.get(data.payload.source.actor)
                            let target = data.payload.target.token ? game.actors.tokens[data.payload.target.token] : game.actors.get(data.payload.target.actor)
                            MerchantSheetDSK.finishTransaction(source, target, data.payload.price, data.payload.itemId, data.payload.buy, data.payload.amount)
                        }
                        break
                    case "playWhisperSound":
                        if (data.payload.whisper.includes(game.user.id))
                            AudioHelper.play({ src: data.payload.soundPath, volume: 0.8, loop: false }, false);

                        break
                    case "socketedConditionAddActor":
                        fromUuid(data.payload.id).then(item => {
                            const onUse = new OnUseEffect(item)
                            onUse.socketedConditionAddActor(data.payload.actors.map(x => game.actors.get(x)), data.payload.data)
                        })
                        break
                    case "socketedConditionAdd":
                        fromUuid(data.payload.id).then(item => {
                            const onUse = new OnUseEffect(item)
                            onUse.socketedConditionAdd(data.payload.targets, data.payload.data)
                        })
                        break
                    case "socketedRemoveCondition":
                        fromUuid(data.payload.id).then(item => {
                            const onUse = new OnUseEffect(item)
                            onUse.socketedRemoveCondition(data.payload.targets, data.payload.coreId)
                        })
                        break
                    case "socketedActorTransformation":
                        fromUuid(data.payload.id).then(item => {
                            const onUse = new OnUseEffect(item)
                            onUse.socketedActorTransformation(data.payload.targets, data.payload.update)
                        })
                        break
                    case "itemDrop":
                        {
                            let sourceActor = data.payload.sourceActorId ? game.actors.get(data.payload.sourceActorId) : undefined
                            fromUuid(data.payload.itemId).then(item => {
                                dropToGround(sourceActor, item, data.payload.data, data.payload.amount)
                            })
                        }
                        break
                    default:
                        console.warn(`Unhandled socket data type ${data.type}`)
                }
            })
        }

        await DSKTutorial.firstTimeMessage()
        DidYouKnow.showOneMessage()

        if (DSKUtility.moduleEnabled("vtta-tokenizer") && !(await game.settings.get("dsk", "tokenizerSetup")) && game.user.isGM) {
            await game.settings.set("vtta-tokenizer", "default-frame-pc", "[data] systems/dsk/icons/backgrounds/token_green.webp")
            await game.settings.set("vtta-tokenizer", "default-frame-npc", "[data] systems/dsk/icons/backgrounds/token_black.webp")
            await game.settings.set("vtta-tokenizer", "default-frame-neutral", "[data] systems/dsk/icons/backgrounds/token_blue.webp")
            await game.settings.set("dsk", "tokenizerSetup", true)
        }
        if (DSKUtility.moduleEnabled("dice-so-nice") && !(await game.settings.get("dsk", "diceSetup")) && game.user.isGM) {
            await game.settings.set("dice-so-nice", "immediatelyDisplayChatMessages", true)
            await game.settings.set("dsk", "diceSetup", true)
        }
        ItemDSK.setupSubClasses()
        DSKIniTracker.connectHooks()
        TokenHotbar2.registerTokenHotbar()
        setEnrichers()
    })
}