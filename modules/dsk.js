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
import { DSKCombat, DSKCombatant, DSKCombatTracker } from "./hooks/combat_tracker.js"
import DSKChatListeners from "./system/chat_listeners.js"
import SpecialabilityRulesDSK from "./system/specialability-rules.js"
import AdvantageRulesDSK from "./system/advantage-rules.js"
import Migrakel from "./system/migrakel.js"
import DSKStatusEffects from "./status/status_effects.js"
import DPS from "./system/derepositioningsystem.js"
import DiceDSK from "./system/dicedsk.js"
import RollMemory from "./system/roll_memory.js"
import MacroDSK from "./system/macroControl.js"
import DSKPause from "./system/pause.js"

Hooks.once("init", () => {
    console.log("Initializing DSK system")

    CONFIG.statusEffects = DSK.statusEffects
    game.dsk = {
        apps: {
            DSKUtility,
            DSKInitializer,
            DSKChatListeners,
            SpecialabilityRulesDSK,
            AdvantageRulesDSK,
            Migrakel,
            DPS,
            DiceDSK,
            DSKStatusEffects,
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
        macro: MacroDSK,
        memory: new RollMemory(),
        itemLibrary: new DSKItemLibrary()
    }

    CONFIG.Actor.documentClass = ActorDSK
    CONFIG.Item.documentClass = ItemDSK
    CONFIG.ActiveEffect.documentClass = DSKActiveEffect
    CONFIG.ui.combat = DSKCombatTracker
    CONFIG.ui.hotbar = DSKHotbar
    CONFIG.ui.pause = DSKPause
    CONFIG.Combat.documentClass = DSKCombat
    CONFIG.Combatant.documentClass = DSKCombatant
    CONFIG.ActiveEffect.documentClass = DSKActiveEffect
    CONFIG.ChatMessage.template = "systems/dsk/templates/chat/chat-message.html"
    CONFIG.ActiveEffect.legacyTransferral = false
})

initHooks()