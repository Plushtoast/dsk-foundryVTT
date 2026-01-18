import { MerchantSheetMixin } from "./merchantmixin.js";
import ActorSheetCreature from "./actor_sheet_creature.js"

export default class CreatureMerchantSheetDSK extends MerchantSheetMixin(ActorSheetCreature) {
    static PARTS = {
        header: {
            template: 'systems/dsk/templates/actors/creature/creature-header.hbs',
            templates: [
                'systems/dsk/templates/actors/actorv2/avatar.hbs',
                'systems/dsk/templates/actors/parts/rollhead.hbs',
                'systems/dsk/templates/actors/parts/healthbar.hbs',
            ],
        },
        tabs: super.PARTS.tabs,
        main: {
            template: 'systems/dsk/templates/actors/creature/creature-main.hbs',
            scrollable: [''],
        },
        combat: super.PARTS.combat,
        skills: super.PARTS.skills,
        magic: super.PARTS.magic,
        inventory: {
            template: 'systems/dsk/templates/actors/merchant/merchant-commerce.hbs',
            scrollable: [''],
            templates: ['systems/dsk/templates/actors/parts/gearSearch.hbs'],
        },
        status: super.PARTS.status,
        notes: {
            template: 'systems/dsk/templates/actors/creature/creature-notes.hbs',
            scrollable: [''],
        },
    };
}