import ItemDSK from "../item/item_dsk.js"
import DidYouKnow from "../system/didyouknow.js"
import DSKUtility from "../system/dsk_utility.js"
import DSKTutorial from "../system/tutorial.js"
import { connectHook } from "./itemDrop.js"
import { setEnrichers } from "./texteditor.js"
import DSKIniTracker from "../system/dsk-ini-tracker.js"
import TokenHotbar2 from "../system/tokenHotbar2.js"

import { initImagePopoutTochat } from "./imagepopouttochat.js"
import { connectSocket } from "./socket.js"

export function initReady(){
    Hooks.once("ready", async() => {
        connectSocket();
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
        connectHook()
        TokenHotbar2.registerTokenHotbar()
        initImagePopoutTochat()
        
        setEnrichers()
    })
}