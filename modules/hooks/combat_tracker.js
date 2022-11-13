import ActorDSK from "../actor/actor_dsk.js";
import DSKUtility from "../system/dsk_utility.js";

export class DSKCombatTracker extends CombatTracker {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            template: "/systems/dsk/templates/system/combattracker.html"
        });
    }

    activateListeners(html) {
        super.activateListeners(html)

        html.find('.combatant.actor .aggroButton').click(ev => {
            ev.preventDefault()
            ev.stopPropagation()
            DSKCombatTracker.runActAttackDialog()
        })
    }

    static runActAttackDialog() {
        if (!game.combat) return

        const combatant = game.combat.combatant
        if (game.user.isGM || combatant.isOwner)
            ActAttackDialog.showDialog(combatant.actor, combatant.tokenId)
            
    }

    async getData(options) {
            const data = await super.getData(options);

            for (let turn of data.turns) {
                const combatant = data.combat.turns.find(x => x.id == turn.id)
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

            turn.effects = new Set();
            if (combatant.token) {
                combatant.token.effects.forEach(e => turn.effects.add(e));
                if (combatant.token.overlayEffect) turn.effects.add(combatant.token.overlayEffect);
            }
            if (combatant.actor) combatant.actor.temporaryEffects.forEach(e => {
                if (e.getFlag("core", "statusId") === CONFIG.Combat.defeatedStatusId) turn.defeated = true;
                else if (e.icon && isAllowedToSeeEffects && !e.notApplicable && (game.user.isGM || !e.getFlag("dsk", "hidePlayers")) && !e.getFlag("dsk", "hideOnToken")) turn.effects.add(e.icon);
            })
        }
        return data
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
                await k.setFlag("dsk", "defenseCount", 0 )
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
            const comb = this.getCombatantFromActor(speaker)
            if (comb && !getProperty(comb.actor, "system.config.defense")) {
                await comb.setFlag("dsk", "defenseCount", (comb.getFlag("dsk", "defenseCount") || 0) + 1)
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
        if(data.flags == undefined) data.flags = {}

        mergeObject(data.flags, {
            dsk: {defenseCount: 0}
        })
        super(data, context);
    }
}

Hooks.on("preCreateCombatant", (data, options, user) => {
    const actor = DSKUtility.getSpeaker({actor: data.actorId, scene: data.sceneId, token: data.token_id})
    if(getProperty(actor.system, "merchant.merchantType") == "loot") return false
})

class RepeatingEffectsHelper {
    static async updateCombatHook(combat, updateData, x, y) {
        if (!updateData.round && !updateData.turn)
            return

        if (combat.round != 0 && combat.turns && combat.active){
            if(combat.previous.round < combat.current.round)
                await RepeatingEffectsHelper.startOfRound(combat)
        }
    }

    static async startOfRound(combat) {
        const activeGM = game.users.find(u => u.active && u.isGM)

        if (!(activeGM && game.user.id == activeGM.id)) return

        for (let turn of combat.turns) {
            if (!turn.defeated) {
                for (let x of turn.actor.effects) {
                    const statusId = x.getFlag("core", "statusId")
                    if (statusId == "bleeding") await this.applyBleeding(turn)
                    else if (statusId == "burning") await this.applyBurning(turn, x)
                }

                await this.startOfRoundEffects(turn)
            }
        }
    }

    static async startOfRoundEffects(turn){
        const regenerationAttributes = ["LeP", "AeP"]
        for(const attr of regenerationAttributes){
            for (const ef of turn.actor.system.repeatingEffects.startOfRound[attr]){
                if(getProperty(turn.actor.system.repeatingEffects, `disabled.${attr}`)) continue

                const damageRoll = await new Roll(ef.value).evaluate({ async: true })
                const damage = await damageRoll.render()
                const type = game.i18n.localize(damageRoll.total > 0 ? "dsk.CHATNOTIFICATION.regenerates" : "dsk.CHATNOTIFICATION.getsHurt")
                const applyDamage = `${turn.actor.name} ${type} ${game.i18n.localize(attr)} ${damage}`
                await ChatMessage.create(DSKUtility.chatDataSetup(applyDamage))

                if (attr == "wounds") await turn.actor.applyDamage(damageRoll.total * -1)
                else await turn.actor.applyMana(damageRoll.total * -1)
            }
        }
    }

    static async applyBleeding(turn) {
        if(turn.actor.system.status.wounds.value <= 0) return 

        await ChatMessage.create(DSKUtility.chatDataSetup(game.i18n.format('dsk.CHATNOTIFICATION.bleeding', { actor: turn.actor.name })))
        await turn.actor.applyDamage(1)
    }

    static async applyBurning(turn, effect) {
        if(turn.actor.system.status.wounds.value <= 0) return 
        
        const step = Number(effect.getFlag("dsk", "value"))
        const protection = DSKStatusEffects.resistantToEffect(turn.actor, effect)
        const die =  { 0: "1", 1: "1d3", 2: "1d6", 3: "2d6" }[step - protection] || "1"
        const damageRoll = await new Roll(die).evaluate({ async: true })
        const damage = await damageRoll.render()

        await ChatMessage.create(DSKUtility.chatDataSetup(game.i18n.format(`dsk.CHATNOTIFICATION.burning.${step}`, { actor: turn.actor.name, damage })))
        await turn.actor.applyDamage(damageRoll.total)
    }
}

Hooks.on("updateCombat", RepeatingEffectsHelper.updateCombatHook)