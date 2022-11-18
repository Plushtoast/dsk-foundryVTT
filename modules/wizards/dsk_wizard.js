import DSKUtility from "../system/dsk_utility.js"

export default class WizardDSK extends Application {
    constructor(app) {
        super(app)
        this.items = []
        this.actor = null
        this.errors = []
        this.dataTypes = []
        this.attributes = []
        this.updating = false
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.tabs = [{ navSelector: ".tabs", contentSelector: ".content", initial: "description" }]
        mergeObject(options, {
            classes: options.classes.concat(["dsk", "largeDialog"]),
            width: 750,
            height: 640,
        });
        options.resizable = true
        return options;
    }

    async updateSkill(skills, itemType, factor = 1, bonus = true) {
        let itemsToUpdate = []
        for (let skill of skills) {
            let parsed = DSKUtility.parseAbilityString(skill.trim())
            let res = this.actor.items.find(i => { return i.type == itemType && i.name == parsed.name });
            if (res) {
                let skillUpdate = duplicate(res)
                skillUpdate.system.level = Math.max(0, factor * parsed.step + (bonus ? Number(skillUpdate.system.level) : 0))
                itemsToUpdate.push(skillUpdate)
            } else {
                console.warn(`Could not find ${itemType} ${skill}`)
                this.errors.push(`${game.i18n.localize(itemType)}: ${skill}`)
            }
        }
        await this.actor.updateEmbeddedDocuments("Item", itemsToUpdate);
    }

    activateListeners(html) {
        super.activateListeners(html)
        html.find('button.ok').click(() => {
            if (!this.updating) {
                this.updating = true
                this.updateCharacter().then(
                    () => this.updating = false
                )
            }
        })
        html.find('button.cancel').click(() => { this.close() })
        html.find('.show-item').click(ev => {
            let itemId = $(ev.currentTarget).attr("data-id")
            const item = this.items.find(i => i.id == itemId)
            item.sheet.render(true)
        })
    }

    static flashElem(elem, cssClass = "emphasize") {
        elem.addClass(cssClass)
        setTimeout(function() { elem.removeClass(cssClass) }, 600)
    }

    finalizeUpdate() {
        if (this.errors.length == 0) {
            this.close()
        } else {
            $(this._element).find('.dialog-buttons').html(`<div class="error"><p>${game.i18n.localize('dsk.DSKError.notUnderstood')}</p><ul><li>${this.errors.join("</li><li>")}</li></ul></div>`)
        }
    }
}