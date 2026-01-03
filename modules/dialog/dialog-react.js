import ActorDSK from "../actor/actor_dsk.js"
import DSKUtility from "../system/dsk_utility.js"
import OpposedDSK from "../system/opposeddsk.js"
const { renderTemplate } = foundry.applications.handlebars;

export default class DialogReactDSK extends foundry.applications.api.DialogV2 {
    static DEFAULT_OPTIONS = {
        window: {
            resizable: true,
        },
    };

    static async showDialog(startMessage) {
        let fun = this.callbackResult
        await foundry.applications.api.DialogV2.wait({
            window: { title: game.i18n.localize("dsk.Unopposed"), resizable: true },
            content: await this.getTemplate(startMessage),
            buttons: [
                {
                    action: "ok",
                    icon: "fa fa-check",
                    label: game.i18n.localize("dsk.ok"),
                    callback: (event, button, dialog) => {
                        fun($(button.form).find('[name="entryselection"]').val(), startMessage)
                    }
                },
                {
                    action: "cancel",
                    icon: "fas fa-times",
                    label: game.i18n.localize("dsk.cancel"),
                }
            ]
        });
    }

    static getTargetActor(message) {
        if (!canvas.tokens) return {}

        let speaker = message.flags.unopposeData.targetSpeaker
        let actor = canvas.tokens.get(speaker.token).actor

        if (!actor) {
            ui.notifications.error("dsk.DSKError.noProperActor", { localize: true })
            return {}
        }
        return {
            actor,
            tokenId: speaker.token
        }
    }

    static async getTemplate(startMessage) { return "" }

    static callbackResult(selection, message, ev) {}
}


export class ReactToSkillDialog extends DialogReactDSK {
    static async getTemplate(startMessage) {
        const attackMessage = game.messages.get(startMessage.flags.unopposeData.attackMessageId)
        const source = attackMessage.flags.data.preData.source
        const item = source.name
        let items = (await DSKUtility.allSkillsList()).map(k => { return { name: k, id: k } })
        items.unshift({
            name: game.i18n.localize("dsk.doNothing"),
            id: "doNothing"
        })
        return renderTemplate('systems/dsk/templates/dialog/dialog-act.html', { items, original: item, title: "DIALOG.selectReaction" })
    }

    static callbackResult(text, message) {
        const { actor, tokenId } = DialogReactDSK.getTargetActor(message)
        if ("doNothing" == text) {
            OpposedDSK.resolveUndefended(message)
        } else {
            const skill = actor.items.find(i => i.name == text && i.type == "skill")
            if (skill) {
                actor.setupSkill(skill, {}, tokenId).then(setupData => {
                    actor.basicTest(setupData)
                });
            }
        }
    }
}

export class ActAttackDialog extends foundry.applications.api.DialogV2 {
    static DEFAULT_OPTIONS = {
        position: {
            width: 550
        },
    };

    static async showDialog(actor, tokenId) {
        const dialog = new ActAttackDialog({
            window: { title: game.i18n.localize("dsk.attacktest") },
            content: await this.getTemplate(actor),
            buttons: []
        })
        dialog.actor = actor
        dialog.tokenId = tokenId
        dialog.render(true)
    }

    async _onRender(context, options) {
        await super._onRender(context, options);

        const html = $(this.element);
        html.find('.reactClick').on('click', ev => {
            this.callbackResult(ev.currentTarget.dataset.value, this.actor, this.tokenId)
            this.close()
        });
    }

    static async getTemplate(actor) {
        const combatskills = actor.items.filter(x => x.type == "combatskill").map(x => ActorDSK._calculateCombatSkillValues(x.toObject(), actor.system))
        let items = []

        const types = ["meleeweapon", "rangeweapon"]
        const traitTypes = ["meleeAttack", "rangeAttack"]

        for (let x of actor.items) {
            if (types.includes(x.type) && x.system.worn.value == true) {
                const preparedItem = x.type == "meleeweapon" ? ActorDSK._prepareMeleeWeapon(x.toObject(), combatskills, actor) : ActorDSK._prepareRangeWeapon(x.toObject(), [], combatskills, actor)
                items.push({
                    name: x.name,
                    id: x.name,
                    img: x.img,
                    value: preparedItem.attack
                })
            } else if (x.type == "trait" && traitTypes.includes(x.system.traitType)) {
                items.push({
                    name: x.name,
                    id: x.name,
                    img: x.img,
                    value: x.system.at
                })
            }
        }
        return await renderTemplate('systems/dsk/templates/dialog/dialog-reaction-attack.html', { dieClass: "die-mu", items, title: "dsk.DIALOG.selectAction" })
    }

    callbackResult(text, actor, tokenId) {
        const types = ["meleeweapon", "trait", "rangeweapon"]
        const result = actor.items.find(x => { return types.includes(x.type) && x.name == text })
        if (result) {
            actor.setupWeapon(result, "attack", {}, tokenId).then(setupData => {
                actor.basicTest(setupData)
            });
        }
    }
}
