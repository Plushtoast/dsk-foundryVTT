import DSKUtility from "../system/dsk_utility.js";
import WizardDSK from "./dsk_wizard.js"
const { mergeObject, duplicate } = foundry.utils

export default class CultureWizard extends WizardDSK {
    static DEFAULT_OPTIONS = {
        window: {
            title: 'dsk.WIZARD.addItem',
        },
    };

    static PARTS = {
        main: {
            template: 'systems/dsk/templates/wizard/add-culture-wizard.hbs',
            scrollable: [''],
            templates: ['systems/dsk/templates/system/dsktabs.hbs'],
        },
    };

    static TABS = {
        sheet: {
            tabs: [
                { id: 'description', label: 'dsk.description' },
                { id: 'general', label: 'dsk.WIZARD.generalTab' },
                { id: 'vantages', label: 'TYPES.Item.advantage' },
            ],
            initial: 'description',
        },
    };

    get title() {
        return game.i18n.format("dsk.WIZARD.addItem", { item: `${game.i18n.localize("TYPES.Item.culture")} ${this.culture?.name || ''}` });
    }

    async _prepareContext(options) {
        const data = await super._prepareContext(options);

        const baseCost = 0
        const vantages = await this.parseToItem(this.culture.system.advantages ?? "", ["advantage", "disadvantage"])
        const advantages = vantages.filter(x => x.type == "advantage")
        const disadvantages = vantages.filter(x => x.type == "disadvantage")
        const vantagesToChose = advantages.length > 0 || disadvantages.length > 0
        mergeObject(data, {
            title: game.i18n.format("dsk.WIZARD.addItem", { item: `${DSKUtility.categoryLocalization("culture")} ${this.culture.name}` }),
            culture: this.culture,
            description: game.i18n.format("dsk.WIZARD.culturedescr", { culture: this.culture.name, cost: baseCost }),
            vantagesToChose,
            advantagesToChose: advantages.length > 0,
            disadvantagesToChose: disadvantages.length > 0,
            advantages,
            disadvantages,
            general: !!data.generalToChose,
            vantages: vantagesToChose
        })
        this.filterTabs(data)
        return data
    }

    async addCulture(actor, item) {
        this.actor = actor
        this.culture = duplicate(item)
    }

    async updateCharacter() {
        let parent = $(this.element)
        parent.find("button.ok i").toggleClass("fa-check fa-spinner fa-spin")

        let apCost = Number(parent.find('.apCost').text())
        if (!this._validateInput($(this.element)) || !(await this.actor.checkEnoughXP(apCost)) || await this.alreadyAdded(this.actor.system.details.culture, "culture")) {
            parent.find("button.ok i").toggleClass("fa-check fa-spinner fa-spin")
            return
        }

        let update = { "system.details.culture": this.culture.name }

        await this.actor._updateAPs(apCost, {}, { render: false })
        await this.addSelections(parent.find('.optional:checked'))
        await this.updateSkill(this.culture.system.skills.split(","), ["combatskill", "skill"])
        await this.actor.update(update);

        this.finalizeUpdate()
    }
}