import ActorSheetDSK from "./actor_sheet_dsk.js";

export default class ActorSheetCharacter extends ActorSheetDSK{
    static get defaultOptions() {
        const options = super.defaultOptions;
        mergeObject(options, {
            classes: options.classes.concat(["dsk", "actor", "character-sheet"]),
            width: 784,
        });
        return options;
    }

    get template() {
        if (this.showLimited()) return "systems/dsk/templates/actors/npc-limited.html";
        return "systems/dsk/templates/actors/actor-sheet.html";
    }
}