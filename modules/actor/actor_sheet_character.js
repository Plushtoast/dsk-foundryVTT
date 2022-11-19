import ActorSheetDSK from "./actor_sheet_dsk.js";
import SpeciesWizard from "../wizards/species_wizard.js"
import CultureWizard from "../wizards/culture_wizard.js"
import CareerWizard from "../wizards/career_wizard.js"

export default class ActorSheetCharacter extends ActorSheetDSK{
    static get defaultOptions() {
        const options = super.defaultOptions;
        mergeObject(options, {
            classes: options.classes.concat(["dsk", "actor", "character-sheet"]),
            width: 795,
        });
        return options;
    }

    get template() {
        if (this.showLimited()) return "systems/dsk/templates/actors/npc-limited.html";
        return "systems/dsk/templates/actors/actor-sheet.html";
    }

    async _manageDragItems(item, typeClass) {
        switch (typeClass) {
            case "aggregatedTest":
                await this.actor.createEmbeddedDocuments("Item", [item]);
                break;
            case "species":
                let spwizard = new SpeciesWizard()
                await spwizard.addSpecies(this.actor, item)
                spwizard.render(true)
                break;
            case "culture":
                let cuwizard = new CultureWizard()
                await cuwizard.addCulture(this.actor, item)
                cuwizard.render(true)
                break
            case "profession":
                let cwizard = new CareerWizard()
                await cwizard.addCareer(this.actor, item)
                cwizard.render(true)
                break;
            default:
                return super._manageDragItems(item, typeClass)
        }
    }
}