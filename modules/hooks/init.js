import ActorSheetCharacter from "../actor/actor_sheet_character.js";
import ActorSheetCreature from "../actor/actor_sheet_creature.js";
import ActorSheetNPC from "../actor/actor_sheet_npc.js";
import ItemSheetDSK from "../item/item_sheet_dsk.js";
import DSKJournalSheet from "../journal/journal_sheet.js";
import DPS from "../system/derepositioningsystem.js";
import { setupHandlebars } from "./handlebars.js";
import { setupJournal } from "./journal.js";
import { setupMacros } from "./macro_support.js";
import { initReady } from "./ready.js";
import { initSetup } from "./setup.js";
import { initSidebar } from "./sidebar.js";
import { initActorHooks } from "./actor.js"
import { initDSN } from "./dicesonice.js";
import { initChatlogHooks } from "./chatlog.js"
import { initTokenHUD } from "./tokenHUD.js"
import { initRollsFunction } from "../system/dskrolls.js"
import DSKActiveEffectConfig from "../status/active_effects.js";
import MerchantSheetDSK from "../actor/merchant-sheet.js"
import CreatureMerchantSheetDSK from "../actor/creature-merchant-sheet.js"
import CharacterSheetMerchantDSK from "../actor/character-merchant-sheet.js"
import migrateWorld from "../system/migrator.js";
import { initChatContext } from "./chat_context.js";
import { initHook } from "./nobgmapnote.js";
import { setActorDelta } from "./actordelta.js";

export function initHooks() {
    setupJournal()
    setupHandlebars()
    setupMacros()
    initSidebar()
    initActorHooks()
    initDSN()
    initChatlogHooks()
    initTokenHUD()
    initRollsFunction()
    migrateWorld()
    initChatContext()
    setActorDelta()

    Hooks.once("init", () => {
        foundry.applications.handlebars.loadTemplates([
            "systems/dsk/templates/system/dsktabs.hbs",
            "systems/dsk/templates/items/item-equipment.hbs",
            "systems/dsk/templates/items/item-header.hbs",
            "systems/dsk/templates/items/item-description.hbs",
            "systems/dsk/templates/items/item-effects.hbs",
            "systems/dsk/templates/items/item-stat.hbs",
            "systems/dsk/templates/actors/parts/healthbar.hbs",
            "systems/dsk/templates/actors/actor-talents.hbs",
            "systems/dsk/templates/actors/actor-combat.hbs",
            "systems/dsk/templates/actors/actor-equipment.hbs",
            "systems/dsk/templates/actors/parts/gearSearch.hbs",
            "systems/dsk/templates/actors/parts/purse.hbs",
            "systems/dsk/templates/actors/parts/characteristics-small.hbs",
            "systems/dsk/templates/actors/parts/status_effects.hbs",
            "systems/dsk/templates/actors/parts/containerContent.hbs",
            "systems/dsk/templates/actors/actor-notes.hbs",
            "systems/dsk/templates/actors/creature/creature-combat.hbs",
            "systems/dsk/templates/actors/creature/creature-main.hbs",
            "systems/dsk/templates/actors/creature/creature-magic.hbs",
            "systems/dsk/templates/status/advanced_functions.hbs",
            "systems/dsk/templates/actors/creature/creature-loot.hbs",
            "systems/dsk/templates/dialog/default-dialog.hbs",
            "systems/dsk/templates/actors/character/actor-magic.hbs",
            "systems/dsk/templates/actors/parts/characteristics-large.hbs",
            "systems/dsk/templates/actors/npc/npc-main.hbs",
            "systems/dsk/templates/actors/parts/rollhead.hbs",
            "systems/dsk/templates/actors/actor-main.hbs",
            "systems/dsk/templates/chat/roll/test-card.hbs",
            "systems/dsk/templates/dialog/parts/targets.hbs",
            "systems/dsk/templates/dialog/default-combat-dialog.hbs",
            "systems/dsk/templates/actors/creature/creature-notes.hbs",
            "systems/dsk/templates/dialog/enhanced-default-dialog.hbs",
            "systems/dsk/templates/actors/parts/information.hbs",
            "systems/dsk/templates/actors/merchant/merchant-commerce.hbs",
            "systems/dsk/templates/actors/parts/normalhead.hbs"
        ])

        foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
        foundry.documents.collections.Actors.registerSheet("dsk", ActorSheetCharacter, { types: ["character"], makeDefault: true });
        foundry.documents.collections.Actors.registerSheet("dsk", ActorSheetCreature, { types: ["creature"], makeDefault: true });
        foundry.documents.collections.Actors.registerSheet("dsk", ActorSheetNPC, { types: ["npc"], makeDefault: true });
        foundry.documents.collections.Actors.registerSheet("dsk", MerchantSheetDSK, { types: ["npc"] });
        foundry.documents.collections.Actors.registerSheet("dsk", CreatureMerchantSheetDSK, { types: ["creature"] })
        foundry.documents.collections.Actors.registerSheet("dsk", CharacterSheetMerchantDSK, { types: ["character"] })
        foundry.applications.apps.DocumentSheetConfig.unregisterSheet(ActiveEffect, "core", foundry.applications.sheets.ActiveEffectConfig)
        foundry.applications.apps.DocumentSheetConfig.registerSheet(ActiveEffect, "dsk", DSKActiveEffectConfig, { makeDefault: true })
        foundry.documents.collections.Journal.registerSheet("dsk", DSKJournalSheet, { makeDefault: true })

        ItemSheetDSK.setupSheets()
    })

    console.warn("DSK | Initializing DSK system hooks")
    
    initReady()
    initSetup()
    initHook()

    DPS.initDoorMinDistance()
}

