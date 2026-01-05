import ActorSheetDSK from "./actor_sheet_dsk.js";
import SpeciesWizard from "../wizards/species_wizard.js"
import CultureWizard from "../wizards/culture_wizard.js"
import CareerWizard from "../wizards/career_wizard.js"

export default class ActorSheetCharacter extends ActorSheetDSK {
    static DEFAULT_OPTIONS = {
        position: {
            width: 795,
        },
        classes: ['dsk', 'actor', 'character-sheet'],
    };

    // Uses parent PARTS definition - header, tabs, and content areas

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