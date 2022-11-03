import DSKUtility from "./system/dsk_utility.js"
import ActorDSK from "./actor/actor_dsk.js"
import ItemDSK from "./item/item_dsk.js"
import ActorSheetDSK from "./actor/actor_sheet_dsk.js"
import ItemSheetDSK from "./item/item_sheet_dsk.js"
import { initHooks } from "./hooks/init.js"
import DSK from "./system/config.js"
import ActorSheetCharacter from "./actor/actor_sheet_character.js"
import ActorSheetCreature from "./actor/actor_sheet_creature.js"
import ActorSheetNPC from "./actor/actor_sheet_npc.js"
import DSKItemLibrary from "./system/itemlibrary.js"
import DSKActiveEffect from "./status/dsk_active_effects.js"
import DSKHotbar from "./system/hotbar.js"
import DSKInitializer from "./system/initializer.js"

Hooks.once("init", () => {
    console.log("Initializing DSK system")

    CONFIG.statusEffects = DSK.statusEffects
    game.dsk = {
        apps: {
            DSKUtility,
            DSKInitializer
        },
        documents: {
            ActorDSK,
            ItemDSK
        },
        sheets: {
            ActorSheetDSK,
            ItemSheetDSK,
            ActorSheetCreature,
            ActorSheetCharacter,
            ActorSheetNPC
        },
        config: DSK,
        itemLibrary: new DSKItemLibrary()
    }

    CONFIG.Actor.documentClass = ActorDSK
    CONFIG.Item.documentClass = ItemDSK
    CONFIG.ActiveEffect.documentClass = DSKActiveEffect
    CONFIG.ui.hotbar = DSKHotbar
    CONFIG.ChatMessage.template = "systems/dsk/templates/chat/chat-message.html"
})

initHooks()