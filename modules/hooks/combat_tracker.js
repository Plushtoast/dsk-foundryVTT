import ActorDSK from "../actor/actor_dsk.js";
import DSKUtility from "../system/dsk_utility.js";
import { ActAttackDialog } from "../dialog/dialog-react.js"
const { getProperty, mergeObject } = foundry.utils

export class DSKCombatTracker extends foundry.applications.sidebar.tabs.CombatTracker {
    static PARTS = {
        header: {
            template: 'templates/sidebar/tabs/combat/header.hbs',
        },
        tracker: {
            template: 'systems/dsk/templates/system/combattracker.hbs',
        },
        footer: {
            template: 'templates/sidebar/tabs/combat/footer.hbs',
        },
    };

    static DEFAULT_OPTIONS = {
        actions: {
            aggroButton: this._onAggroButtonClicked,
        },
    };

    static _onAggroButtonClicked() {
        DSKCombatTracker.runActAttackDialog();
    }

    static runActAttackDialog() {
        if (!game.combat) return

        const combatant = game.combat.combatant
        if (game.user.isGM || combatant.isOwner)
            ActAttackDialog.showDialog(combatant.actor, combatant.tokenId)

    }

    async _prepareTurnContext(combat, combatant, index) {
        const turn = await super._prepareTurnContext(combat, combatant, index);
        const isAllowedToSeeEffects = (game.user.isGM || (combatant.actor && combatant.actor.testUserPermission(game.user, "OBSERVER")) || !(game.settings.get("dsk", "hideEffects")));
        turn.defenseCount = combatant.system.defenseCount;
        turn.roundInitiative = combatant.system.roundInitiative;

        let remainders = []
        if (combatant.actor) {
            for (const x of combatant.actor.items) {
                if (x.type == "rangeweapon" && x.system.worn.value && x.system.reloadTimeprogress > 0) {
                    const wpn = { name: x.name, remaining: ActorDSK.calcLZ(x, combatant.actor) - x.system.reloadTimeprogress }
                    if (wpn.remaining > 0) remainders.push(wpn)
                } else if (["spell", "liturgy"].includes(x.type) && x.system.castingTime.modified > 0) {
                    const wpn = { name: x.name, remaining: x.system.castingTime.modified - x.system.castingTime.progress }
                    if (wpn.remaining > 0) remainders.push(wpn)
                }
            }
        }
        remainders = remainders.sort((a, b) => a.remaining - b.remaining)

        if (remainders.length > 0) {
            turn.ongoings = `${game.i18n.localize('dsk.COMBATTRACKER.ongoing')}\n${remainders.map((x) => `${x.name} - ${x.remaining}`).join("\n")}`

            turn.ongoing = remainders[0].remaining
        }

        const effects = [];
        for (const e of combatant.actor?.temporaryEffects || []) {
            if (e.statuses.has('defeated')) turn.defeated = true;
            else if (e.img && isAllowedToSeeEffects && !e.notApplicable && (game.user.isGM || !e.getFlag('dsk', 'hidePlayers')) && !e.getFlag('dsk', 'hideOnToken')) {
                effects.push({ img: e.img, name: e.name });
            }
        }
        turn.effects = {
            icons: effects,
            tooltip: this._formatEffectsTooltip(effects),
        };

        return turn;
    }

    _canSortInitiative(event) {
        return game.user.isGM;
    }

    _dragStartInitiativeSort(event) {
        const dataTransfer = {
            type: 'CombatantSort',
            data: {
                combatantId: event.currentTarget.dataset.combatantId,
            },
        };
        event.dataTransfer.setData('text/plain', JSON.stringify(dataTransfer));
    }

    _dragOverInitiativeSort(event) {
        event.preventDefault();
        const fieldset = event.target.closest('.combatant');

        if (fieldset) {
            if (this.lastFieldset !== fieldset) {
                if (this.lastFieldset) {
                    this.lastFieldset.classList.remove('dragSortMarker');
                }
                fieldset.classList.add('dragSortMarker');
                this.lastFieldset = fieldset;
            }
        } else if (this.lastFieldset) {
            this.lastFieldset.classList.remove('dragSortMarker');
            this.lastFieldset = null;
        }
    }

    async _dropInitiativeSort(event) {
        event.preventDefault();
        if (this.lastFieldset) {
            this.lastFieldset.classList.remove('dragSortMarker');
            this.lastFieldset = null;
        }

        const hoverTarget = event.target.closest('.combatant');
        if (!hoverTarget) return;

        const data = JSON.parse(event.dataTransfer.getData('text/plain'));

        if (data.type !== 'CombatantSort') return;

        const combatantId = data.data.combatantId;
        const targetId = hoverTarget.dataset.combatantId;

        if (targetId === combatantId) return;

        const combatant = game.combat.combatants.get(combatantId);
        const targetCombatant = game.combat.combatants.get(targetId);

        const roundInitiative = targetCombatant.properInitiative;
        let update = {};
        if (event.ctrlKey) {
            update.initiative = roundInitiative + 0.00001;
            update.system = {
                roundInitiative: -1,
            };
        } else {
            update.system = {
                roundInitiative: roundInitiative + 0.00001,
            };
        }

        await combatant.update(update);
    }

    async _onRender(context, options) {
        await super._onRender(context, options);

        new foundry.applications.ux.DragDrop.implementation({
            dragSelector: ".combatant",
            dropSelector: ".combat-tracker",
            permissions: {
                dragstart: this._canSortInitiative.bind(this),
                drop: this._canSortInitiative.bind(this)
            },
            callbacks: {
                dragstart: this._dragStartInitiativeSort.bind(this),
                dragover: this._dragOverInitiativeSort.bind(this),
                drop: this._dropInitiativeSort.bind(this)
            }
        }).bind(this.element);
    }
}

export class DSKCombat extends Combat {
    constructor(data, context) {
        super(data, context);
    }

    async refreshTokenbars() {
        if (game.dsk.apps.tokenHotbar) game.dsk.apps.tokenHotbar.updateDSKHotbar()
    }

    _onCreate(data, options, userId) {
        super._onCreate(data, options, userId);
        this.refreshTokenbars()
    }

    _onDelete(options, userId) {
        super._onDelete(options, userId);
        this.refreshTokenbars()
    }

    async previousRound() {
        await this.clearRoundState();
        return await super.previousRound();
    }

    async nextRound() {
        await this.clearRoundState();
        return await super.nextRound()
    }

    _sortCombatants(a, b) {
        let ia = Number.isNumeric(a.initiative) ? a.initiative : -Infinity;
        let ib = Number.isNumeric(b.initiative) ? b.initiative : -Infinity;

        if (a.system.roundInitiative >= 0) ia = a.system.roundInitiative;
        if (b.system.roundInitiative >= 0) ib = b.system.roundInitiative

        return (ib - ia) || (a.id > b.id ? 1 : -1);
    }

    async clearRoundState() {
        if (game.user.isGM) {
            for (let k of this.turns) {
                await k.update({ 'system.defenseCount': 0, "system.roundInitiative": -1 });
            }
        } else {
            await game.socket.emit('system.dsk', {
                type: 'clearCombat',
                payload: {},
            });
        }
    }

    async getDefenseCount(speaker) {
        const comb = this.getCombatantFromActor(speaker);
        return comb?.system.defenseCount
    }

    getCombatantFromActor(speaker) {
        if (!speaker) return undefined;

        if (speaker.token) {
            return this.combatants.find(combatant => combatant.tokenId === speaker.token);
        } else if (speaker.actor) {
            return this.combatants.find(combatant => combatant.actorId === speaker.actor);
        }

        return undefined;
    }

    async updateDefenseCount(speaker) {
        if (game.user.isGM) {
            const comb = this.getCombatantFromActor(speaker);
            if (comb && !comb.actor.system.config.defense) {
                await comb.update({ 'system.defenseCount': comb.system.defenseCount + 1 });
            }
        } else {
            await game.socket.emit('system.dsa5', {
                type: 'updateDefenseCount',
                payload: {
                    speaker,
                },
            });
        }
    }
}

export class DSKCombatant extends Combatant {
    constructor(data, context) {
        if (!data.type) data.type = 'dsacombatant';
        super(data, context);
    }

    async recalcInitiative() {
        if (this.initiative) {
            const roll = await this.getFlag("dsk", "baseRoll") || 0
            const update = { "initiative": roll + this.actor.system.stats.ini.value }
            await this.update(update)
        }
    }

    get properInitiative() {
        return this.system.roundInitiative >= 0 ? this.system.roundInitiative : this.initiative;
    }
}

Hooks.on("preCreateCombatant", (data, options, user) => {
    const actor = DSKUtility.getSpeaker({ actor: data.actorId, scene: data.sceneId, token: data.token_id })
    if (getProperty(actor.system, "merchant.merchantType") == "loot") return false
})

Hooks.on("updateCombatant", (combatant, change, user) => {
    if (!DSKUtility.isActiveGM()) return

    if (change.initiative) {
        const baseRoll = combatant.getFlag("dsk", "baseRoll")
        if (!baseRoll) {
            const parts = `${change.initiative}`.split(".")
            const roll = Number(parts[0]) - Math.round(combatant.actor.system.stats.ini.value)
            combatant.setFlag("dsk", "baseRoll", roll)
        }
    } else if ("initiative" in change && change.initiative == null) {
        combatant.update({ [`flags.dsk.-=baseRoll`]: null })
    }
})

class RepeatingEffectsHelper {
    static async updateCombatHook(combat, updateData, x, y) {
        if (!updateData.round && !updateData.turn)
            return

        if (combat.round != 0 && combat.turns && combat.active) {
            if (combat.previous.round < combat.current.round)
                await RepeatingEffectsHelper.startOfRound(combat)
        }
    }

    static async startOfRound(combat) {
        const activeGM = game.users.find(u => u.active && u.isGM)

        if (!(activeGM && game.user.id == activeGM.id)) return

        for (let turn of combat.turns) {
            if (!turn.defeated) {
                for (let x of turn.actor.effects) {
                    const statusesId = [...x.statuses][0]
                    if (statusesId == "bleeding") await this.applyBleeding(turn)
                    else if (statusesId == "burning") await this.applyBurning(turn, x)
                }

                await this.startOfRoundEffects(turn)
            }
        }
    }

    static async startOfRoundEffects(turn) {
        const regenerationAttributes = ["LeP", "AeP"]
        for (const attr of regenerationAttributes) {
            for (const ef of turn.actor.system.repeatingEffects.startOfRound[attr]) {
                if (getProperty(turn.actor.system.repeatingEffects, `disabled.${attr}`)) continue

                const damageRoll = await new Roll(ef.value).evaluate()
                const damage = await damageRoll.render()
                const type = game.i18n.localize(damageRoll.total > 0 ? "dsk.CHATNOTIFICATION.regenerates" : "dsk.CHATNOTIFICATION.getsHurt")
                const applyDamage = `${turn.actor.name} ${type} ${game.i18n.localize(attr)} ${damage}`
                await ChatMessage.create(DSKUtility.chatDataSetup(applyDamage))

                if (attr == "LeP") await turn.actor.applyDamage(damageRoll.total * -1)
                else await turn.actor.applyMana(damageRoll.total * -1)
            }
        }
    }

    static async applyBleeding(turn) {
        if (turn.actor.system.stats.LeP.value <= 0) return

        await ChatMessage.create(DSKUtility.chatDataSetup(game.i18n.format('dsk.CHATNOTIFICATION.bleeding', { actor: turn.actor.name })))
        await turn.actor.applyDamage(1)
    }

    static async applyBurning(turn, effect) {
        if (turn.actor.system.stats.LeP.value <= 0) return

        const step = Number(effect.getFlag("dsk", "value"))
        const protection = DSKStatusEffects.resistantToEffect(turn.actor, effect)
        const die = { 0: "1", 1: "1d3", 2: "1d6", 3: "2d6" }[step - protection] || "1"
        const damageRoll = await new Roll(die).evaluate()
        const damage = await damageRoll.render()

        await ChatMessage.create(DSKUtility.chatDataSetup(game.i18n.format(`dsk.CHATNOTIFICATION.burning.${step}`, { actor: turn.actor.name, damage })))
        await turn.actor.applyDamage(damageRoll.total)
    }
}

Hooks.on("updateCombat", RepeatingEffectsHelper.updateCombatHook)