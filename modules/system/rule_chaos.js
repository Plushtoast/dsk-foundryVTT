
import DSKUtility from "./dsk_utility.js";
import SpecialabilityRulesDSK from "./specialability-rules.js";

export default class RuleChaos {
    static regex2h = /\(2H/;

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

    static multipleDefenseValue(actor, item) {
        let multipleDefense = -2

        if ((getProperty(item, "system.combatskill") == game.i18n.localize("dsk.LocalizedIDs.wrestle")) && SpecialabilityRulesDSK.hasAbility(actor, game.i18n.localize("dsk.LocalizedIDs.masterfulDodge")))
            multipleDefense = -2
        else if (SpecialabilityRulesDSK.hasAbility(actor, game.i18n.localize("dsk.LocalizedIDs.mightyMasterfulParry")))
            multipleDefense = -1
        else if (SpecialabilityRulesDSK.hasAbility(actor, game.i18n.localize("dsk.LocalizedIDs.masterfulParry")))
            multipleDefense = -2

        return Math.min(0, multipleDefense)
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

    static increment(ev, item, path, limit = undefined) {
        const factor = ev.ctrlKey ? 10 : 1
        const sign = ev.button == 2 ? -1 : 1
        let value = getProperty(item, path) + (factor * sign)
        if (limit != undefined) value = Math.max(limit, value)
        setProperty(item, path, value)
    }
}