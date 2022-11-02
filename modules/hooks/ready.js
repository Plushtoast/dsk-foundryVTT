import ItemDSK from "../item/item_dsk.js"
import DidYouKnow from "../system/didyouknow.js"
import DSKTutorial from "../system/tutorial.js"
import { setEnrichers } from "./texteditor.js"

export function initReady(){
    Hooks.once("ready", async() => {
        if(game.user.isGM){
            game.socket.on("system.dsk", data => {
                switch(data.type){
                    default:
                        console.warn(`Unhandled socket data type ${data.type}`)
                }
            })
        }

        await DSKTutorial.firstTimeMessage()
        DidYouKnow.showOneMessage()

        /*if (dsk_Utility.moduleEnabled("vtta-tokenizer") && !(await game.settings.get("dsk", "tokenizerSetup")) && game.user.isGM) {
            await game.settings.set("vtta-tokenizer", "default-frame-pc", "[data] systems/dsk/icons/backgrounds/token_green.webp")
            await game.settings.set("vtta-tokenizer", "default-frame-npc", "[data] systems/dsk/icons/backgrounds/token_black.webp")
            await game.settings.set("vtta-tokenizer", "default-frame-neutral", "[data] systems/dsk/icons/backgrounds/token_blue.webp")
            await game.settings.set("dsk", "tokenizerSetup", true)
        }*/
        ItemDSK.setupSubClasses()
        setEnrichers()
    })
}