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
                    case "updateDefenseCount":
                        if (game.combat) game.combat.updateDefenseCount(data.payload.speaker)
                        break
                    case "showDamage":
                        OpposedDSK.showDamage(game.messages.get(data.payload.id), data.payload.hide)
                        break
                    case "clearCombat":
                        if (game.combat) game.combat.nextRound()
                        break
                    case "trade":
                        {
                            let source = data.payload.source.token ? game.actors.tokens[data.payload.source.token] : game.actors.get(data.payload.source.actor)
                            let target = data.payload.target.token ? game.actors.tokens[data.payload.target.token] : game.actors.get(data.payload.target.actor)
                            MerchantSheetDSK.finishTransaction(source, target, data.payload.price, data.payload.itemId, data.payload.buy, data.payload.amount)
                        }
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