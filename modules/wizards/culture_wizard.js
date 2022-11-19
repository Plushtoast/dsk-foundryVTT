import DSKUtility from "../system/dsk_utility.js";
import WizardDSK from "./dsk_wizard.js"

export default class CultureWizard extends WizardDSK {

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.title = game.i18n.format("dsk.WIZARD.addItem", { item: `${game.i18n.localize("ITEM.TypeCulture")}` })
        options.template = 'systems/dsk/templates/wizard/add-culture-wizard.html'
        return options;
    }

    async getData(options) {
        const data = await super.getData(options);

        const baseCost = 0
        mergeObject(data, {
            title: game.i18n.format("dsk.WIZARD.addItem", { item: `${DSKUtility.categoryLocalization("culture")} ${this.culture.name}` }),
            culture: this.culture,
            description: game.i18n.format("dsk.WIZARD.culturedescr", { culture: this.culture.name, cost: baseCost })
        })
        return data
    }

    async addCulture(actor, item) {
        this.actor = actor
        this.culture = duplicate(item)
    }

    async updateCharacter() {
        let parent = $(this._element)
        parent.find("button.ok i").toggleClass("fa-check fa-spinner fa-spin")

        let apCost = Number(parent.find('.apCost').text())
        if (!this._validateInput($(this._element)) || !(await this.actor.checkEnoughXP(apCost)) || await this.alreadyAdded(this.actor.system.details.culture, "culture")) {
            parent.find("button.ok i").toggleClass("fa-check fa-spinner fa-spin")
            return
        }

        let update = { "system.details.culture": this.culture.name }

        await this.actor.update(update);
        await this.actor._updateAPs(apCost)
        await this.updateSkill(this.culture.system.skills.split(","), "skill")

        this.finalizeUpdate()
    }
}