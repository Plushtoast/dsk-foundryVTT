import ActorSheetCharacter from "./actor_sheet_character.js";

export default class ActorSheetNPC extends ActorSheetCharacter {
    static DEFAULT_OPTIONS = {
        classes: ['dsk', 'actor', 'npc-sheet'],
    };

    static PARTS = {
        header: {
            template: 'systems/dsk/templates/actors/actorv2/header.hbs',
            templates: [
                'systems/dsk/templates/actors/actorv2/avatar.hbs',
                'systems/dsk/templates/actors/actorv2/actor-header.hbs',
                'systems/dsk/templates/actors/parts/rollhead.hbs',
                'systems/dsk/templates/actors/parts/healthbar.hbs'
            ],
        },
        tabs: {
            template: 'systems/dsk/templates/actors/actorv2/tabs.hbs',
            id: "tabs",
            templates: [
                "systems/dsk/templates/system/dsktabs.hbs"
            ],
        },
        combat: {
            template: 'systems/dsk/templates/actors/actor-combat.hbs',
            scrollable: [''],
        },
        skills: {
            template: 'systems/dsk/templates/actors/actor-talents.hbs',
            scrollable: [''],
        },
        magic: {
            template: 'systems/dsk/templates/actors/character/actor-magic.hbs',
            scrollable: [''],
        },
        status: {
            template: 'systems/dsk/templates/actors/parts/status_effects.hbs',
            scrollable: [''],
        },
        notes: {
            template: 'systems/dsk/templates/actors/actor-notes.hbs',
            scrollable: [''],
        },
        main: {
            template: 'systems/dsk/templates/actors/npc/npc-main.hbs',
            scrollable: [''],
        },
        inventory: {
            template: 'systems/dsk/templates/actors/actor-equipment.hbs',
            scrollable: [''],
        },
    }
}