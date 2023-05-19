import DSKUtility from "../system/dsk_utility.js";
import ItemRulesDSK from "../system/item-rules.js";
import WizardDSK from "./dsk_wizard.js"

export default class CareerWizard extends WizardDSK {
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.title = game.i18n.format("dsk.WIZARD.addItem", { item: `${game.i18n.localize("TYPES.Item.profession")}` })
        options.template = 'systems/dsk/templates/wizard/add-career-wizard.html'
        return options;
    }

    async getData(options) {
        const data = await super.getData(options);
        const requirements =
            [
                ...await this.parseToItem(this.career.system.requirements.advantage, ["disadvantage", "advantage"]),
                ...await this.parseToItem(this.career.system.requirements.specialability, ["specialability"]) 
            ]
        const missingVantages = requirements.filter(x => ["advantage", "disadvantage"].includes(x.type) && !x.disabled)
        const baseCost = 0
        const reqCost = requirements.reduce(function(_this, val) {
            return _this + (val.disabled ? 0 : Number(val.system.ap) || 0)
        }, 0)
        const missingSpecialabilities = requirements.filter(x => x.type == "specialability" && !x.disabled)
        mergeObject(data, {
            title: game.i18n.format("dsk.WIZARD.addItem", { item: `${DSKUtility.categoryLocalization("profession")} ${this.career.name}` }),
            career: this.career,
            description: game.i18n.format("dsk.WIZARD.careerdescr", { career: this.career.name, cost: baseCost + reqCost }),
            baseCost,
            missingVantagesToChose: missingVantages.length > 0,
            missingSpecialabiltiesToChose: missingSpecialabilities.length > 0
        })
        return data
    }

    async addCareer(actor, item) {
        this.actor = actor
        this.career = duplicate(item)
    }

    async setAbility(value, types) {
        if (value.trim() == "")
            return

        let itemsToCreate = []
        let itemsToUpdate = []

        for (let k of value.split(",")) {
            if(["", "-"].includes(k.trim())) continue

            let parsed = DSKUtility.parseAbilityString(k.trim())
            let item = this.actor.items.find(x => types.includes(x.type) && x.name == parsed.original)
            if (item) {
                item = duplicate(item)
                if(item.system.level != undefined) item.system.level = parsed.step

                item = ItemRulesDSK.reverseAdoptionCalculation(this.actor, parsed, item)
                itemsToUpdate.push(item)
            } else {
                item = await this.findCompendiumItem(parsed.original, types)
                if (!item) {
                    item = await this.findCompendiumItem(parsed.name, types)
                }
                if (item) {
                    item = duplicate(item)
                    item.name = parsed.original
                    if(item.system.level != undefined) item.system.level = parsed.step

                    item = ItemRulesDSK.reverseAdoptionCalculation(this.actor, parsed, item)
                    itemsToCreate.push(item)
                } else {
                    const langCats = types.map(x => DSKUtility.categoryLocalization(x)).join("/")
                    this.errors.push(`${langCats}: ${k}`)
                    ui.notifications.error(game.i18n.format("dsk.DSKError.notFound", { category: langCats, name: k }))
                }
            }
        }
        await this.actor.updateEmbeddedDocuments("Item", itemsToUpdate, {}, { render: false })
        await this.actor.createEmbeddedDocuments("Item", itemsToCreate, {}, { render: false })
    }

    async updateCharacter() {
        let parent = $(this._element)
        parent.find("button.ok i").toggleClass("fa-check fa-spinner fa-spin")

        let apCost = Number(parent.find('.apCost').text())
        if (!this._validateInput($(this._element)) || !(await this.actor.checkEnoughXP(apCost)) || await this.alreadyAdded(this.actor.system.details.profession, "profession")) {
            parent.find("button.ok i").toggleClass("fa-check fa-spinner fa-spin")
            return
        }

        let update = {
            "system.details.profession": this.career.name
        }

        if (this.career.system.isAncestor) {
            await this.setAbility(this.career.system.ahnengabe, ["ahnengabe"])
            await this.setAbility(this.career.system.ahnengeschenk, ["ahnengeschenk"])
        }

        await this.setAbility(this.career.system.requirements.specialability, ["specialability"])
        await this.setAbility(this.career.system.requirements.advantage, ["advantage", "disadvantage"])
        await this.actor._updateAPs(apCost, {}, { render: false })

        const skills = [
            ...this.career.system.skills.body.split(","),
            ...this.career.system.skills.social.split(","),
            ...this.career.system.skills.mental.split(","),
            ...this.career.system.skills.trade.split(",")
        ]
        
        await this.updateSkill(skills, "skill")
        await this.updateSkill(this.career.system.skills.combat.split(","), "combatskill")
        await this.actor.update(update);

        this.finalizeUpdate()
    }
}