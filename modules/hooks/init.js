import ActorSheetCharacter from "../actor/actor_sheet_character.js";
import ActorSheetCreature from "../actor/actor_sheet_creature.js";
import ActorSheetNPC from "../actor/actor_sheet_npc.js";
import ItemSheetDSK from "../item/item_sheet_dsk.js";
import DSKJournalSheet from "../journal/journal_sheet.js";
import { setupHandlebars } from "./handlebars.js";
import { setupJournal } from "./journal.js";
import { setupMacros } from "./macro_support.js";
import { initReady } from "./ready.js";
import { initSetup } from "./setup.js";
import { initSidebar } from "./sidebar.js";

export function initHooks(){
    setupJournal()
    setupHandlebars()
    setupMacros()
    initSidebar()

    Hooks.once("init", () => {
        loadTemplates([
            "systems/dsk/templates/items/item-equipment.html",
            "systems/dsk/templates/items/item-header.html",
            "systems/dsk/templates/items/item-description.html",
            "systems/dsk/templates/items/item-effects.html"
        ])
    })
    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("dsk", ActorSheetCharacter, { types: ["character"], makeDefault: true });
    Actors.registerSheet("dsk", ActorSheetCreature, { types: ["creature"], makeDefault: true });
    Actors.registerSheet("dsk", ActorSheetNPC, { types: ["npc"], makeDefault: true });
    Journal.registerSheet("dsk", DSKJournalSheet, {makeDefault: true})

    ItemSheetDSK.setupSheets()

    initReady()
    initSetup()
}