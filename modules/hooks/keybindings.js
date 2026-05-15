import DSKUtility from "../system/dsk_utility.js"
import { DSKCombatTracker } from "./combat_tracker.js"

export function setupKeybindings() {    
    game.keybindings.register("dsk", "combatTrackerNext", {
        name: "COMBAT.TurnNext",
        hint: _loc("COMBAT.TurnNext"),
        editable: [{ key: "KeyN" }],
        onDown: () => combatTurn("nextTurn")
    })
    game.keybindings.register("dsk", "combatTrackerPrevious", {
        name: "COMBAT.TurnPrev",
        hint: _loc("COMBAT.TurnPrev"),
        editable: [{ key: "KeyV" }],
        onDown: () => combatTurn("previousTurn")
    })
    game.keybindings.register("dsk", "attacktest", {
        name: "attacktest",
        hint: _loc("dsk.KEYBINDINGS.attack"),
        editable: [{ key: "KeyB" }],
        onDown: () => DSKCombatTracker.runActAttackDialog()
    })
    game.keybindings.register("dsk", "journalBrowser", {
        name: "Book.Wizard",
        hint: _loc("dsk.KEYBINDINGS.journalBrowser"),
        editable: [{ key: "KeyJ" }],
        onDown: () => DSKUtility.renderToggle(game.dsk.apps.journalBrowser)
    })
    game.keybindings.register("dsk", "library", {
        name: "ItemLibrary",
        hint: _loc("dsk.KEYBINDINGS.library"),
        editable: [{ key: "KeyL" }],
        onDown: () => DSKUtility.renderToggle(game.dsk.itemLibrary)
    })
}

const combatTurn = (mode) => {
    game.combat?.combatant?.isOwner && game.combat[mode]()
}
