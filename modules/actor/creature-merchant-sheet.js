import { MerchantSheetMixin } from "./merchantmixin.js";
import ActorSheetCreature from "./actor_sheet_creature.js"

export default class CreatureMerchantSheetDSK extends MerchantSheetMixin(ActorSheetCreature) {
    static get merchantTemplate() {
        return "systems/dsk/templates/actors/merchant/creature-merchant-sheet.html";
    }
}