import ActorSheetCharacter from "./actor_sheet_character.js";

export default class ActorSheetNPC extends ActorSheetCharacter {
    static DEFAULT_OPTIONS = {
        classes: ['dsk', 'actor', 'npc-sheet'],
    };

    static PARTS = {
        main: {
            template: "systems/dsk/templates/actors/npc-sheet.hbs",
        },
        limited: {
            template: "systems/dsk/templates/actors/npc-limited.hbs",
        },
    };

    get template() {
        if (this.showLimited()) return ActorSheetNPC.PARTS.limited.template;
        return ActorSheetNPC.PARTS.main.template;
    }
}