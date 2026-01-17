import DSKCombatDialog from './dialog-combat-dsk.js'
import DialogShared from './dialog-shared.js'
import SkillDialogDSK from './dialog-skill-dsk.js'
import DSKSpellDialog from './dialog-spell.js'

export default class DSKDialog extends DialogShared {
    static DEFAULT_OPTIONS = {
        window: {
            resizable: true,
        },
    };

    static getDialogForItem(type) {
        switch (type) {
            case "rangeweapon":
            case "meleeweapon":
            case "trait":
                return DSKCombatDialog;
            case "ahnengabe":
                return DSKSpellDialog;
            case "skill":
                return SkillDialogDSK;
        }
        return DSKDialog;
    }

    static getRollButtons(testData, dialogOptions, resolve, reject) {
        const buttons = [
            {
                action: 'rollButton',
                label: "dsk.Roll",
                callback: (event, button, dialog) => {
                    const html = $(button.form);
                    game.dsk.memory.remember(testData.extra.speaker, testData.source, testData.mode, html);
                    resolve(dialogOptions.callback(html));
                },
            }
        ];

        if (game.user.isGM) {
            buttons.push({
                action: 'cheat',
                label: "dsk.DIALOG.cheat",
                callback: (event, button, dialog) => {
                    const html = $(button.form);
                    game.dsk.memory.remember(testData.extra.speaker, testData.source, testData.mode, html);
                    resolve(dialogOptions.callback(html, { cheat: true }));
                },
            });
        }
        return buttons;
    }

    async _onRender(context, options) {
        await super._onRender(context, options);

        const html = $(this.element);
        html.find('.dieButton').on('click', (ev) => {
            const elem = $(ev.currentTarget);
            if (ev.currentTarget.dataset.single === 'true') {
                elem.closest('.dialog-content').find('.dieButton').removeClass('dieSelected');
            }
            elem.toggleClass('dieSelected');
        });
    }
}