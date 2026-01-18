import { DefaultAppv2 } from "../actor/baseapp.js"
import DPS from "../system/derepositioningsystem.js"
import DSKUtility from "../system/dsk_utility.js"
const { renderTemplate } = foundry.applications.handlebars;

export class AddTargetDialog extends DefaultAppv2 {
    static DEFAULT_OPTIONS = {
        window: { title: 'dsk.DIALOG.addTarget' },
    };

    static PARTS = {
        main: {
            template: 'systems/dsk/templates/dialog/addTarget-dialog.hbs',
        },
    };

    constructor(speaker) {
        super();
        this.speaker = speaker;
    }

    static async getDialog(speaker) {
        return new AddTargetDialog(speaker);
    }

    async _prepareContext(_options) {
        const data = await super._prepareContext(_options);
        const targets = Array.from(game.user.targets).map(x => x.id);
        data.selectables = [];
        const token = canvas.scene?.tokens.get(this.speaker.token)?.object;
        if (game.combat) {
            game.combat.combatants.forEach(combatant => {
                if (!combatant.visible) return;

                combatant.isSelected = targets.includes(combatant.token.id);
                if (token && combatant.token) {
                    const combatantToken = canvas.scene.tokens.get(combatant.token.id).object;
                    combatant.distance = DPS.rangeFinder(token, combatantToken);
                    combatant.distance.distanceSum = Number(combatant.distance.distanceSum.toFixed(1));
                }
                data.selectables.push(combatant);
            });
        }
        return data;
    }

    async _onRender(context, options) {
        await super._onRender(context, options);

        const html = $(this.element);
        const combatants = html.find('.combatant');
        combatants.on('dblclick', ev => this.setTargets(ev, true));
        combatants.on('click', ev => this.setTargets(ev));
        combatants.on('pointerover', this._onCombatantHoverIn.bind(this));
        combatants.on('pointerout', this._onCombatantHoverOut.bind(this));
        combatants.on('mousedown', ev => this._onRightClick(ev));
    }

    _onCombatantHoverOut(ev) {
        this._getCombatApp()._onCombatantHoverOut(ev);
    }

    _onCombatantHoverIn(ev) {
        this._getCombatApp()._onCombatantHoverIn(ev);
    }

    _onRightClick(ev) {
        if (ev.button == 2) {
            const combatant = game.combat.combatants.get(ev.currentTarget.dataset.combatantId);
            if (combatant.token) {
                return canvas.animatePan({ x: combatant.token.x, y: combatant.token.y });
            }
        }
    }

    _getCombatApp() {
        return game.combats.apps[0];
    }

    async setTargets(ev, close = false) {
        const isShift = ev.originalEvent.shiftKey;
        if (!isShift)
            $(ev.currentTarget).closest('.directory').find('.combatant').removeClass('selectedTarget');

        $(ev.currentTarget).addClass("selectedTarget");
        const combatantId = ev.currentTarget.dataset.combatantId;
        const combatant = game.combat.combatants.get(combatantId);

        combatant.token.object.setTarget(true, { user: game.user, releaseOthers: !isShift, groupSelection: true });

        if (close) this.close();
    }
}

export class SelectUserDialog extends DefaultAppv2 {
    static DEFAULT_OPTIONS = {
        classes: ["dsk5Decent"],
        window: { title: 'dsk.DIALOG.setTargetToUser' },
    };

    static PARTS = {
        main: {
            template: 'systems/dsk/templates/dialog/selectForUserDialog.hbs',
        },
    };

    static async getDialog() {
        return new SelectUserDialog();
    }

    async _prepareContext(_options) {
        const data = await super._prepareContext(_options);
        data.users = game.users.filter(x => x.active && !x.isGM);
        return data;
    }

    static registerButtons() {
        Hooks.on("getSceneControlButtons", btns => {
            if (!game.user.isGM) return;

            const userSelect = {
                name: "targetUser",
                title: "dsk.CONTROLS.targetForUser",
                icon: "fa fa-bullseye",
                button: true,
                order: 2,
                onChange: async () => { (await SelectUserDialog.getDialog()).render(true) }
            };
            btns.tokens.tools.targetUser = userSelect;
        });
    }

    async _onRender(context, options) {
        await super._onRender(context, options);

        const html = $(this.element);
        html.find('.combatant').on('click', ev => this.setTargetToUser(ev));
    }

    setTargetToUser(ev) {
        const targetIds = Array.from(game.user.targets).map(x => x.id);
        const userId = ev.currentTarget.dataset.userId;
        const user = game.users.get(userId);
        user._onUpdateTokenTargets(targetIds);
        game.socket.emit('userActivity', userId, { targets: targetIds });
        this.close();
    }
}

export class UserMultipickDialog extends foundry.applications.api.DialogV2 {
    static async getDialog(content){
        const users = game.users.filter(x => x.active && !x.isGM)

        new UserMultipickDialog({
            window: { title: "dsk.SHEET.PostItem" },
            content: await renderTemplate('systems/dsk/templates/dialog/usermultipickdialog.hbs', { users }),
            buttons: [
                {
                    action: "yes",
                    icon: "fa fa-check",
                    label: "dsk.yes",
                    default: true,
                    callback: (event, button, dialog) => {
                        this.postContent($(button.form), content)
                    }
                },
                {
                    action: "cancel",
                    icon: "fas fa-times",
                    label: "dsk.cancel"
                }
            ],
        }).render(true)
    }

    static async postContent(dlg, content){
        const chatOptions = DSKUtility.chatDataSetup(content)
        if(!dlg.find('#sel_all').is(':checked')){
            const ids = []
            dlg.find('.usersel:checked').each(function(){
                ids.push($(this).val());
            });
            chatOptions.whisper = ids
        }

        ChatMessage.create(chatOptions)
    }

    async _onRender(context, options) {
        await super._onRender(context, options);

        const html = $(this.element);
        html.find('[name="sel_all"]').on('change', ev => {
            html.find('.usersel').prop('disabled', ev.currentTarget.checked).prop('checked', ev.currentTarget.checked)
        });
    }
}