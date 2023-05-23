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
import { initTokenHook } from "./statuseffect.js"
import { initTokenHUD } from "./tokenHUD.js"
import { initRollsFunction } from "../system/dskrolls.js"
import DSKActiveEffectConfig from "../status/active_effects.js";
import MerchantSheetDSK from "../actor/merchant-sheet.js"
import CreatureMerchantSheetDSK from "../actor/creature-merchant-sheet.js"
import CharacterSheetMerchantDSK from "../actor/character-merchant-sheet.js"
import migrateWorld from "../system/migrator.js";
import { initChatContext } from "./chat_context.js";
import { initHook } from "./nobgmapnote.js";

export function initHooks(){
    setupJournal()
    setupHandlebars()
    setupMacros()
    initSidebar()
    initActorHooks()
    initDSN()
    initChatlogHooks()
    initTokenHook()
    initTokenHUD()
    initRollsFunction()
    migrateWorld()
    initChatContext()

    Hooks.once("init", () => {
        loadTemplates([
            "systems/dsk/templates/items/item-equipment.html",
            "systems/dsk/templates/items/item-header.html",
            "systems/dsk/templates/items/item-description.html",
            "systems/dsk/templates/items/item-effects.html",
            "systems/dsk/templates/items/item-stat.html",
            "systems/dsk/templates/actors/parts/healthbar.html",
            "systems/dsk/templates/actors/actor-talents.html",
            "systems/dsk/templates/actors/actor-combat.html",
            "systems/dsk/templates/actors/actor-equipment.html",
            "systems/dsk/templates/actors/parts/gearSearch.html",
            "systems/dsk/templates/actors/parts/purse.html",
            "systems/dsk/templates/actors/parts/characteristics-small.html",
            "systems/dsk/templates/actors/parts/status_effects.html",
            "systems/dsk/templates/actors/parts/containerContent.html",
            "systems/dsk/templates/actors/actor-notes.html",
            "systems/dsk/templates/actors/creature/creature-combat.html",
            "systems/dsk/templates/actors/creature/creature-main.html",
            "systems/dsk/templates/actors/creature/creature-magic.html",
            "systems/dsk/templates/status/advanced_functions.html",
            "systems/dsk/templates/actors/creature/creature-loot.html",
            "systems/dsk/templates/dialog/default-dialog.html",
            "systems/dsk/templates/actors/character/actor-magic.html",
            "systems/dsk/templates/actors/parts/characteristics-large.html",
            "systems/dsk/templates/actors/npc/npc-main.html",
            "systems/dsk/templates/actors/parts/rollhead.html",
            "systems/dsk/templates/actors/actor-main.html",
            "systems/dsk/templates/chat/roll/test-card.html",
            "systems/dsk/templates/dialog/parts/targets.html",
            "systems/dsk/templates/dialog/default-combat-dialog.html",
            "systems/dsk/templates/actors/creature/creature-notes.html",
            "systems/dsk/templates/dialog/enhanced-default-dialog.html",
            "systems/dsk/templates/actors/parts/information.html",
            "systems/dsk/templates/actors/merchant/merchant-commerce.html",
            "systems/dsk/templates/actors/parts/normalhead.html"
        ])
    })
    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("dsk", ActorSheetCharacter, { types: ["character"], makeDefault: true });
    Actors.registerSheet("dsk", ActorSheetCreature, { types: ["creature"], makeDefault: true });
    Actors.registerSheet("dsk", ActorSheetNPC, { types: ["npc"], makeDefault: true });
    Actors.registerSheet("dsk", MerchantSheetDSK, { types: ["npc"] });
    Actors.registerSheet("dsk", CreatureMerchantSheetDSK, { types: ["creature"] })
    Actors.registerSheet("dsk", CharacterSheetMerchantDSK, { types: ["character"] })
    DocumentSheetConfig.registerSheet(ActiveEffect, "dsk", DSKActiveEffectConfig, { makeDefault: true })
    Journal.registerSheet("dsk", DSKJournalSheet, {makeDefault: true})


    ItemSheetDSK.setupSheets()

    
    initReady()
    initSetup()
    initHook()

    DPS.initDoorMinDistance()
}

