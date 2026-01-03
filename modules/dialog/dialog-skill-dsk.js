import DSKDialog from "./dialog-dsk.js";
import DialogShared from "./dialog-shared.js";
import ActorDSK from "../actor/actor_dsk.js";

export default class SkillDialogDSK extends DialogShared {
    static DEFAULT_OPTIONS = {
        position: {
            width: 700
        },
        window: {
            resizable: true,
        },
    };

    static getRollButtons(testData, dialogOptions, resolve, reject) {
        let buttons = DSKDialog.getRollButtons(testData, dialogOptions, resolve, reject);
        // Update the rollButton label
        const rollButton = buttons.find(b => b.action === "rollButton");
        if (rollButton) rollButton.label = game.i18n.localize("dsk.Opposed");

        // Add nonOpposedButton at the beginning
        buttons.unshift({
            action: "nonOpposedButton",
            label: game.i18n.localize("dsk.Roll"),
            callback: (event, button, dialog) => {
                const html = $(button.form);
                game.dsk.memory.remember(testData.extra.speaker, testData.source, testData.mode, html)
                testData.opposable = false
                resolve(dialogOptions.callback(html))
            },
        });
        return buttons;
    }

    async _onRender(context, options) {
        await super._onRender(context, options);

        const html = $(this.element);
        html.on("change", "input,select", ev => this.rememberFormData(ev));

        let targets = this.readTargets();
        const that = this;
        this.checkTargets = setInterval(function() {
            targets = that.compareTargets(html, targets);
        }, 500);

        this.rememberFormData();
        html.on('mousedown', '.quantity-click', ev => this.rememberFormData(ev));

        html.find(".modifiers option").on('mousedown', (ev) => {
            this.rememberFormData(ev);
        });
    }

    rememberFormData(ev) {
        const data = new foundry.applications.ux.FormDataExtended($(this.element).find('form')[0]).object;
        data.situationalModifiers = ActorDSK._parseModifiers($(this.element));
    }
}