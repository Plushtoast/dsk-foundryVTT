import ActorDSK from "../actor/actor_dsk.js";
import DSKUtility from "../system/dsk_utility.js";
import { ActAttackDialog } from "../dialog/dialog-react.js"
const { getProperty, mergeObject } = foundry.utils

export class DSKCombatTracker extends foundry.applications.sidebar.tabs.CombatTracker {
    static PARTS = {
        header: {
            template: 'templates/sidebar/tabs/combat/footer.hbs',
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
        turn.defenseCount = combatant.getFlag("dsk", "defenseCount") || 0

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

    async nextRound() {
        if (game.user.isGM) {
            for (let k of this.turns) {
                await k.setFlag("dsk", "defenseCount", 0)
            }
        } else {
            await game.socket.emit("system.dsk", {
                type: "clearCombat",
                payload: {}
            })
        }
        return await super.nextRound()
    }

    async getDefenseCount(speaker) {
        const comb = this.getCombatantFromActor(speaker)
        return comb ? (comb.getFlag("dsk", "defenseCount") || 0) : 0
    }

    //TODO very clonky
    getCombatantFromActor(speaker) {
        let id
        if (speaker.token) {
            id = Array.from(this.combatants).find(x => x.tokenId == speaker.token)
        } else {
            id = Array.from(this.combatants).find(x => x.actorId == speaker.actor)
        }
        return id ? this.combatants.get(id.id) : undefined
    }

    async updateDefenseCount(speaker) {
        if (game.user.isGM) {
            for (let spe of speaker) {
                const comb = this.getCombatantFromActor({ token: spe })
                if (comb && !getProperty(comb.actor, "system.config.defense")) {
                    await comb.setFlag("dsk", "defenseCount", (comb.getFlag("dsk", "defenseCount") || 0) + 1)
                }
            }
        } else {
            await game.socket.emit("system.dsk", {
                type: "updateDefenseCount",
                payload: {
                    speaker
                }
            })
        }
    }
}

export class DSKCombatant extends Combatant {
    constructor(data, context) {
        if (data.flags == undefined) data.flags = {}

        mergeObject(data.flags, {
            dsk: { defenseCount: 0 }
        })
        super(data, context);
    }

    async recalcInitiative() {
        if (this.initiative) {
            const roll = await this.getFlag("dsk", "baseRoll") || 0
            const update = { "initiative": roll + this.actor.system.stats.ini.value }
            await this.update(update)
        }
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