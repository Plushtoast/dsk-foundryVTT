import { MerchantSheetMixin } from "./merchantmixin.js";
import ActorSheetCharacter from "./actor_sheet_character.js";

export default class CharacterMerchantSheetDSK extends MerchantSheetMixin(ActorSheetCharacter) {
    static PARTS = {
        header: super.PARTS.header,
        tabs: super.PARTS.tabs,
        main: {
            template: 'systems/dsk/templates/actors/actor-main.hbs',
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
        notes: super.PARTS.notes,
    };
}