import WizardDSK from "./dsk_wizard.js"
import DSK from "../system/config.js";

export default class SpeciesWizard extends WizardDSK {
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.title = game.i18n.format("dsk.WIZARD.addItem", { item: `${game.i18n.localize("TYPES.Item.species")}` })
        options.template = 'systems/dsk/templates/wizard/add-species-wizard.html'
        return options;
    }

    async _parseBonus(text){
        const attributeRequirements = []
        let optionals = []
        let anyAttributeRequirements = false
        let attrs = Object.keys(DSK.characteristics)
        let attrRegex = new RegExp(game.i18n.localize("dsk.WIZARDPARSER.speciesAdvantage"), "i")
        for(let k of text.split(",")){
            if(attrRegex.test(k)){
                anyAttributeRequirements = true
                let choices = attrs.filter(x => k.includes(x.toUpperCase()))
                attributeRequirements.push({
                    choices,
                    allowedCount: 1
                })
                break
            } else {
                optionals.push(k.trim())
            }
        }
        optionals = await this.parseToItem(optionals.join(", "), ["advantage", "disadvantage"])
        return { anyAttributeRequirements, attributeRequirements, optionals }
    }

    async getData(options) {
        const data = await super.getData(options);
        const {anyAttributeRequirements, attributeRequirements, optionals} = await this._parseBonus(this.species.system.advantages)
        const generalToChose = anyAttributeRequirements
        mergeObject(data, {
            speciesDescription: game.i18n.has(`dsk.Racedescr.${this.species.name}`) ? game.i18n.localize(`dsk.Racedescr.${this.species.name}`) : this.species.system.description.value,
            species: this.species,
            description: game.i18n.format("dsk.WIZARD.speciesdescr", { species: this.species.name }),
            title: game.i18n.format("dsk.WIZARD.addItem", { item: `${game.i18n.localize("TYPES.Item.species")} ${this.species.name}` }),
            generalToChose,
            anyAttributeRequirements,
            optionals,
            attributeRequirements
        })
        return data
    }

    async addSpecies(actor, item) {
        this.actor = actor
        this.species = duplicate(item)
    }

    async updateCharacter() {
        let parent = $(this._element)
        parent.find("button.ok i").toggleClass("fa-check fa-spinner fa-spin")

        let apCost = Number(parent.find('.apCost').text())
        if (!this._validateInput($(this._element)) || !(await this.actor.checkEnoughXP(apCost)) || await this.alreadyAdded(this.actor.system.details.species, "species")) {
            parent.find("button.ok i").toggleClass("fa-check fa-spinner fa-spin")
            return
        }
        //Todo attribute init and special abilities
        let update = {
            "system.details.species": this.species.name,
            "system.stats.gs.initial": this.species.system.gs,
            "system.stats.sk.initial": this.species.system.sk,
            "system.stats.zk.initial": this.species.system.zk,
            "system.stats.LeP.initial": this.species.system.LeP,
            "system.stats.LeP.value": this.species.system.LeP + this.actor.system.characteristics["ko"].value * 2
        };
        for (let k of parent.find('.exclusive:checked')) {
            update[`system.characteristics.${$(k).val()}.species`] = 1
        }
        await this.actor.update(update);
        await this.actor._updateAPs(apCost)
        await this.addSelections(parent.find('.optional:checked'))
        await this.actor.removeCondition("incapacitated")
        this.finalizeUpdate()
    }
}