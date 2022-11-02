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

Hooks.once("init", () => {
    console.log("Initializing DSK system")

    CONFIG.statusEffects = DSK.statusEffects
    game.dsk = {
        apps: {
            DSKUtility,
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
        config: DSK
    }

    CONFIG.Actor.documentClass = ActorDSK
    CONFIG.Item.documentClass = ItemDSK
})

initHooks()