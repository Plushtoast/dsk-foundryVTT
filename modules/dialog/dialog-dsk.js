import DSKCombatDialog from './dialog-combat-dsk.js'
import DialogShared from './dialog-shared.js'
import SkillDialogDSK from './dialog-skill-dsk.js'
import DSKSpellDialog from './dialog-spell.js'


export default class DSKDialog extends DialogShared {
    static getDialogForItem(type) {
        switch (type) {
            case "rangeweapon":
            case "meleeweapon":
            case "trait":
                return DSKCombatDialog
            case "ahnengabe":
                return DSKSpellDialog
            case "skill":
                return SkillDialogDSK
            
        }
        return DSKDialog
    }

    static getRollButtons(testData, dialogOptions, resolve, reject){
        let buttons = {
            rollButton: {
                label: game.i18n.localize("dsk.check"),
                callback: (html) => {
                    game.dsk.memory.remember(testData.extra.speaker, testData.source, testData.mode, html)
                    resolve(dialogOptions.callback(html))
                },
            },
        }
        if (game.user.isGM) {
            mergeObject(buttons, {
                cheat: {
                    label: game.i18n.localize("dsk.DIALOG.cheat"),
                    callback: (html) => {
                        game.dsk.memory.remember(testData.extra.speaker, testData.source, testData.mode, html)
                        resolve(dialogOptions.callback(html, { cheat: true }))
                    },
                },
            })
        }
        return buttons
    }

    activateListeners(html) {
        super.activateListeners(html)
        html.find(".dieButton").click(ev => {
            let elem = $(ev.currentTarget)
            if (elem.attr("data-single") == "true") {
                elem.closest(".dialog-content").find(".dieButton").removeClass("dieSelected")
            }
            elem.toggleClass('dieSelected')
        })
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        mergeObject(options, {
            resizable: true
        });
        return options;
    }
}