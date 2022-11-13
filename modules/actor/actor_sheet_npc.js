import ActorSheetCharacter from "./actor_sheet_character.js";

export default class ActorSheetNPC extends ActorSheetCharacter{
    static get defaultOptions() {
        const options = super.defaultOptions;
        mergeObject(options, { classes: options.classes.concat(["dsk", "actor", "npc-sheet"]) });
        return options;
    }

    get template() {
        if (this.showLimited()) return "systems/dsk/templates/actors/npc-limited.html";
        return "systems/dsk/templates/actors/npc-sheet.html";
    }
}