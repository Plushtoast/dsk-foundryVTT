import { MerchantSheetMixin } from "./merchantmixin.js";
import ActorSheetCharacter from "./actor_sheet_character.js";

export default class CharacterMerchantSheetDSK extends MerchantSheetMixin(ActorSheetCharacter) {
    static get merchantTemplate() {
        return "systems/dsk/templates/actors/merchant/character-merchant-sheet.html";
    }
}