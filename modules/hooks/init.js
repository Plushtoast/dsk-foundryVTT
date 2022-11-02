import ActorSheetCharacter from "../actor/actor_sheet_character.js";
import ActorSheetCreature from "../actor/actor_sheet_creature.js";
import ActorSheetNPC from "../actor/actor_sheet_npc.js";
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

        ])
    })
    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("dsa5", ActorSheetCharacter, { types: ["character"], makeDefault: true });
    Actors.registerSheet("dsa5", ActorSheetCreature, { types: ["creature"], makeDefault: true });
    Actors.registerSheet("dsa5", ActorSheetNPC, { types: ["npc"], makeDefault: true });
    Journal.registerSheet("dsa5", DSKJournalSheet, {makeDefault: true})

    initReady()
    initSetup()
}