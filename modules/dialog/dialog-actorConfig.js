import Migrakel from "../system/migrakel.js"
const { renderTemplate } = foundry.applications.handlebars;

export default class DialogActorConfig extends foundry.applications.api.DialogV2 {
    constructor(actor, options) {
        super(options)
        this.actor = actor
        this.lock = false
    }

    static async buildDialog(actor) {
        const template = await renderTemplate("systems/dsk/templates/actors/parts/actorConfig.hbs", { actor })
        new DialogActorConfig(actor, {
            window: { title: game.i18n.localize("dsk.SHEET.actorConfig") },
            content: template,
            buttons: [
                {
                    action: "save",
                    icon: "fa fa-check",
                    label: game.i18n.localize("dsk.save"),
                    default: true,
                    callback: (event, button, dialog) => {
                        const dlg = $(button.form);
                        actor.update({
                            "system.config.autoBar": dlg.find('[name="autoBar"]').is(":checked"),
                            "system.config.autoSize": dlg.find('[name="autoSize"]').is(":checked")
                        })
                    }
                },
                {
                    action: "cancel",
                    icon: "fas fa-times",
                    label: game.i18n.localize("dsk.cancel")
                }
            ]
        }).render(true)
    }

    async updateWrapper(fnct, ev) {
        return ui.notifications.warn("There is nothing to migrate yet.")

        if (this.lock) return

        const upd = async() => {
            this.lock = true
            $(ev.currentTarget).prepend('<i class="fas fa-spinner fa-spin"></i>')
            await Migrakel[fnct](this.actor)
            $(ev.currentTarget).find("i").remove()
            this.lock = false
        }
        upd()
    }

    async _onRender(context, options) {
        await super._onRender(context, options);

        const html = $(this.element);
        html.find('.updateSpells').on('click', async(ev) => this.updateWrapper("updateSpellsAndLiturgies", ev));
        html.find('.updateAbilities').on('click', async(ev) => this.updateWrapper("updateSpecialAbilities", ev));
        html.find('.updatecSkills').on('click', async(ev) => this.updateWrapper("updateCombatskills", ev));
        html.find('.updateSkills').on('click', async(ev) => this.updateWrapper("updateSkills", ev));
        html.find('.updateGear').on('click', async(ev) => this.updateWrapper("updateGear", ev));
    }
}