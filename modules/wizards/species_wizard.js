import WizardDSK from "./dsk_wizard.js"

export default class SpeciesWizard extends WizardDSK {
    constructor(app) {
        super(app)
     }

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.title = game.i18n.format("dsk.WIZARD.addItem", { item: `${game.i18n.localize("ITEM.TypeSpecies")}` })
        options.template = 'systems/dsk/templates/wizard/add-species-wizard.html'
        return options;
    }

    activateListeners(html) {
        super.activateListeners(html)


    }

    async getData(options) {
        const data = await super.getData(options);
        
        mergeObject(data, {
            speciesDescription: game.i18n.has(`dsk.Racedescr.${this.species.name}`) ? game.i18n.localize(`dsk.Racedescr.${this.species.name}`) : this.species.system.description.value,
            species: this.species,
            description: game.i18n.format("dsk.WIZARD.speciesdescr", { species: this.species.name }),
            title: game.i18n.format("dsk.WIZARD.addItem", { item: `${game.i18n.localize("ITEM.TypeSpecies")} ${this.species.name}` }),
        })
        return data
    }

    async addSpecies(actor, item) {
        this.actor = actor
        this.species = duplicate(item)
    }

    async updateCharacter() {
        //Todo attribute init and special abilities
        let update = {
            "system.details.species": this.species.name,
            "system.stats.gs.initial": this.species.system.gs,
            "system.stats.sk.initial": this.species.system.sk,
            "system.stats.zk.initial": this.species.system.zk,
            "system.stats.LeP.initial": this.species.system.LeP,
            "system.stats.LeP.value": this.species.system.LeP + this.actor.system.characteristics["ko"].value * 2
        };
        await this.actor.update(update);
        await this.actor.removeCondition("incapacitated")
        this.finalizeUpdate()
    }
}