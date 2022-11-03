
import DSKStatusEffects from "../status/status_effects.js";
import DSKUtility from "./dsk_utility.js";

export default class RuleChaos {
    static regex2h = /\(2H/;

    static async bleedingMessage(actor) {
        await ChatMessage.create(DSKUtility.chatDataSetup(game.i18n.format('CHATNOTIFICATION.applyBleeding', { actor: actor.name, actorId: actor.id, tokenId: actor.token ? actor.token.id : "" })))
    }

    static _getFunctionData(ev) {
        return {
            data: ev.currentTarget.dataset,
            actor: DSKUtility.getSpeaker({
                token: ev.currentTarget.dataset.token,
                actor: ev.currentTarget.dataset.actor,
                scene: canvas.scene ? canvas.scene.id : null
            })
        }
    }

    static isYieldedTwohanded(item){
        const twoHanded = this.regex2h.test(item.name)
        const wrongGrip = item.system.worn.wrongGrip
        return (twoHanded && !wrongGrip) || (!twoHanded && wrongGrip)
    }

    static obfuscateDropData(item, obfuscations){
        if(obfuscations) {
            for(let section of obfuscations) 
                mergeObject(item, { system: {obfuscation: { [section]: true} } } )
        }
    }

    static _buildDuration(rounds) {
        const update = {
            duration: {
                startTime: game.time.worldTime,
                rounds: rounds,
                seconds: rounds * 5
            }
        }
        if (game.combat) {
            mergeObject(update, {
                duration: {
                    combat: game.combat.id,
                    startRound: game.combat.round,
                    startTurn: game.combat.turn
                }
            })
        }
        return update
    }

    static async calcBleeding(ev) {
        const { data, actor } = RuleChaos._getFunctionData(ev)
        if (!actor) return

        const skill = actor.items.find(i => i.name == game.i18n.localize('LocalizedIDs.selfControl') && i.type == "skill");
        actor.setupSkill(skill, {}, data.token).then(async(setupData) => {
            const result = await actor.basicTest(setupData)

            if (result.result.successLevel < 2) {
                const qs = result.result.qualityStep || 0
                let duration = 7
                if (result.result.successLevel == 1) {
                    duration -= Number(qs)
                } else if (result.successLevel < 1) {
                    duration += duration
                }
                const existing = actor.hasCondition("bleeding")
                const durationUpdate = RuleChaos._buildDuration(duration)

                if (existing) {
                    const remaining = game.combat ? (existing.data.duration.startRound || 1) + existing.data.duration.rounds - game.combat.round : existing.data.duration.rounds
                    if (duration > remaining) await existing.update(durationUpdate)
                } else {
                    const bleeding = duplicate(CONFIG.statusEffects.find(x => x.id == "bleeding"))
                    mergeObject(bleeding, durationUpdate)
                    await DSKStatusEffects.addCondition(actor, bleeding, 1, false, true)
                    await ChatMessage.create(DSKUtility.chatDataSetup(game.i18n.format('CHATNOTIFICATION.gotBleeding', { actor: actor.name })))
                }
            }

        });
    }

    static increment(ev, item, path, limit = undefined) {
        const factor = ev.ctrlKey ? 10 : 1
        const sign = ev.button == 2 ? -1 : 1
        let value = getProperty(item, path) + (factor * sign)
        if (limit != undefined) value = Math.max(limit, value)
        setProperty(item, path, value)
    }
}