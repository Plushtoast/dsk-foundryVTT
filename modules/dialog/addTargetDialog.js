import DPS from "../system/derepositioningsystem.js"
import DSKUtility from "../system/dsk_utility.js"
const { renderTemplate } = foundry.applications.handlebars;

export class AddTargetDialog extends foundry.applications.api.DialogV2 {
    static async getDialog(speaker){
        const targets = Array.from(game.user.targets).map(x => x.id)
        const selectables = []
        const token = canvas.scene ? canvas.scene.tokens.get(speaker.token)?.object : undefined
        if(game.combat){
            game.combat.combatants.forEach(combatant => {
                if (!combatant.visible ) return

                combatant.isSelected = targets.includes(combatant.token.id)
                if(token && combatant.token){
                    const combatantToken = canvas.scene.tokens.get(combatant.token.id).object
                    combatant.distance = DPS.rangeFinder(token, combatantToken)
                    combatant.distance.distanceSum = Number(combatant.distance.distanceSum.toFixed(1))
                }
                selectables.push(combatant)
            })
        }
        const dialog = new AddTargetDialog({
            window: { title: game.i18n.localize("dsk.DIALOG.addTarget") },
            content: await renderTemplate('systems/dsk/templates/dialog/addTarget-dialog.hbs', { selectables }),
            buttons: [],
        })
        return dialog
    }

    async _onRender(context, options) {
        await super._onRender(context, options);

        const html = $(this.element);
        const combatants = html.find('.combatant');
        combatants.on('click', ev => this.setTargets(ev));
        combatants.on('mouseenter', this._onCombatantHoverIn.bind(this));
        combatants.on('mouseleave', this._onCombatantHoverOut.bind(this));
        combatants.on('mousedown', ev => this._onRightClick(ev));
    }

    _onCombatantHoverOut(ev) {
        this._getCombatApp()._onCombatantHoverOut(ev)
    }

    _onCombatantHoverIn(ev) {
        this._getCombatApp()._onCombatantHoverIn(ev)
    }

    _onRightClick(ev){
        if(ev.button == 2){
            const combatant = game.combat.combatants.get(ev.currentTarget.dataset.combatantId)
            if ( combatant.token) {
                return canvas.animatePan({x: combatant.token.x, y: combatant.token.y});
            }
        }
    }

    _getCombatApp() {
        return game.combats.apps[0]
    }

    async setTargets(ev){
        const isShift = ev.originalEvent.shiftKey
        if(!isShift)
            $(ev.currentTarget).closest('.directory').find('.combatant').removeClass('selectedTarget')

        $(ev.currentTarget).addClass("selectedTarget")
        const combatantId = ev.currentTarget.dataset.combatantId
        const combatant = game.combat.combatants.get(combatantId)
        
        combatant.token.object.setTarget(true, {user: game.user, releaseOthers: !isShift, groupSelection: true });
    }
}

export class SelectUserDialog extends foundry.applications.api.DialogV2 {
    static DEFAULT_OPTIONS = {
        classes: ["dsk5Decent"],
    };

    static async getDialog(){
        const users = game.users.filter(x => x.active && !x.isGM)
        return new SelectUserDialog({
            window: { title: game.i18n.localize("dsk.DIALOG.setTargetToUser") },
            content: await renderTemplate('systems/dsk/templates/dialog/selectForUserDialog.hbs', { users }),
            buttons: [],
        })
    }

    static registerButtons(){
        Hooks.on("getSceneControlButtons", btns => {
            if(!game.user.isGM) return

            const userSelect = {
                name: "targetUser",
                title: "dsk.CONTROLS.targetForUser",
                icon: "fa fa-bullseye",
                button: true,
                order: 2,
                onChange: async() => { (await SelectUserDialog.getDialog()).render(true) }
            }
            btns.tokens.tools.targetUser = userSelect;
        })
    }

    async _onRender(context, options) {
        await super._onRender(context, options);

        const html = $(this.element);
        html.find('.combatant').on('click', ev => this.setTargetToUser(ev));
    }

    setTargetToUser(ev){
        const targetIds = Array.from(game.user.targets).map(x => x.id)
        const userId = ev.currentTarget.dataset.userId
        const user = game.users.get(userId)
        user._onUpdateTokenTargets(targetIds);
        game.socket.emit('userActivity', userId, { targets: targetIds})
        this.close()
    }
}

export class UserMultipickDialog extends foundry.applications.api.DialogV2 {
    static async getDialog(content){
        const users = game.users.filter(x => x.active && !x.isGM)

        new UserMultipickDialog({
            window: { title: game.i18n.localize("dsk.SHEET.PostItem") },
            content: await renderTemplate('systems/dsk/templates/dialog/usermultipickdialog.hbs', { users }),
            buttons: [
                {
                    action: "yes",
                    icon: "fa fa-check",
                    label: game.i18n.localize("dsk.yes"),
                    default: true,
                    callback: (event, button, dialog) => {
                        this.postContent($(button.form), content)
                    }
                },
                {
                    action: "cancel",
                    icon: "fas fa-times",
                    label: game.i18n.localize("dsk.cancel")
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