import DSKDialog from "./dialog-dsk.js";
import DialogShared from "./dialog-shared.js";
import ActorDSK from "../actor/actor_dsk.js";

export default class SkillDialogDSK extends DialogShared {
    static getRollButtons(testData, dialogOptions, resolve, reject) {
        let buttons = DSKDialog.getRollButtons(testData, dialogOptions, resolve, reject);
        buttons.rollButton.label = game.i18n.localize("dsk.Opposed")
        const nonOpposedButton = {
            nonOpposedButton: {
                label: game.i18n.localize("dsk.Roll"),
                callback: (html) => {
                    game.dsk.memory.remember(testData.extra.speaker, testData.source, testData.mode, html)
                    testData.opposable = false
                    resolve(dialogOptions.callback(html))
                },
            }
        }
        mergeObject(nonOpposedButton, buttons)
        return nonOpposedButton
    }

    activateListeners(html) {
        super.activateListeners(html)

        html.on("change", "input,select", ev => this.rememberFormData(ev))

        let targets = this.readTargets();
        // not great
        const that = this
        this.checkTargets = setInterval(function() {
            targets = that.compareTargets(html, targets);
        }, 500);

        this.rememberFormData()
        html.on('mousedown', '.quantity-click', ev => this.rememberFormData(ev))

        html.find(".modifiers option").mousedown((ev) => {
            this.rememberFormData(ev)
        })
    }

    rememberFormData(ev) {
        const data = new FormDataExtended(this.element.find('form')[0]).object
        data.situationalModifiers = ActorDSK._parseModifiers(this._element)
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        mergeObject(options, {
            width: 700,
            resizable: true,
        });
        return options;
    }
}