import DSKChatListeners from "../system/chat_listeners.js";
import DSK from "../system/config.js";

export default class DSKStatusEffects{
    static bindButtons(html) {
        html.find('.chat-condition').each(function(i, cond) {
            cond.setAttribute("draggable", true);
            cond.addEventListener("dragstart", ev => {
                const dataTransfer = {
                    data: {
                        type: "condition",
                        payload: {
                            id: $(ev.currentTarget).attr("data-id")
                        }
                    }
                }
                ev.dataTransfer.setData("text/plain", JSON.stringify(dataTransfer));
            });
        })
        html.on('click', '.chat-condition', ev => DSKChatListeners.postStatus($(ev.currentTarget).attr("data-id")))
    }

    static createCustomEffect(owner, description = "", label) {
        label = label || game.i18n.localize("dsk.CONDITION.custom")
        if (description == "") description = label

        owner.addCondition({
            label,
            icon: "icons/svg/aura.svg",
            origin: owner.uuid,
            flags: {
                dsk: {
                    value: null,
                    editable: true,
                    description,
                    custom: true
                }
            }
        })
    }

    static async addCondition(target, effect, value = 1, absolute = false, auto = true) {
        if (!target.isOwner) return "Not owned"
        if (target.compendium) return "Can not add in compendium"
        if (absolute && value < 1) return this.removeCondition(target, effect, value, auto, absolute)
        if (typeof(effect) === "string") effect = duplicate(CONFIG.statusEffects.find(e => e.id == effect))
        if (!effect) return "No Effect Found"

        let existing = this.hasCondition(target, effect.id)

        if (existing && existing.flags.dsk.value == null)
            return existing
        else if (existing)
            return await DSKStatusEffects.updateEffect(target, existing, value, absolute, auto, effect)

        return await DSKStatusEffects.createEffect(target, effect, value, auto)
    }

    static async createEffect(actor, effect, value, auto) {
        const immune = this.immuneToEffect(actor, effect)
        if (immune) return immune

        effect.label = game.i18n.localize(effect.label);
        if (auto) {
            effect.flags.dsk.auto = Math.min(effect.flags.dsk.max, value);
            effect.flags.dsk.manual = 0
        } else {
            effect.flags.dsk.manual = Math.min(effect.flags.dsk.max, value);
            effect.flags.dsk.auto = 0
        }

        effect.flags.dsk.value = Math.min(4, effect.flags.dsk.manual + effect.flags.dsk.auto)

        effect["flags.core.statusId"] = effect.id;
        if (effect.id == "dead")
            effect["flags.core.overlay"] = true;

        let result = await actor.createEmbeddedDocuments("ActiveEffect", [duplicate(effect)])
        await actor._dependentEffects(effect.id, effect, 1)
        delete effect.id
        return result
    }

    static async removeCondition(target, effect, value = 1, auto = true, absolute = false) {
        if (!target.isOwner) return "Not owned"
        if (typeof(effect) === "string") effect = duplicate(CONFIG.statusEffects.find(e => e.id == effect))
        if (!effect) return "No Effect Found"

        let existing = this.hasCondition(target, effect.id)

        if (existing && existing.flags.dsk.value == null) {
            if (target.token) target = target.token.actor
            const res = await target.deleteEmbeddedDocuments("ActiveEffect", [existing.id])
                //Hooks.call("deleteActorActiveEffect", target, existing)
            return res
        } else if (existing)
            return await DSKStatusEffects.removeEffect(target, existing, value, absolute, auto)
    }

    static async removeEffect(actor, existing, value, absolute, autoMode) {
        const auto = autoMode ? (absolute ? value : Math.max(0, existing.flags.dsk.auto - value)) : existing.flags.dsk.auto
        const manual = autoMode ? existing.flags.dsk.manual : (absolute ? value : existing.flags.dsk.manual - value)
        const update = {
            flags: {
                dsk: {
                    auto,
                    manual,
                    value: Math.max(0, Math.min(existing.flags.dsk.max, manual + auto))
                }
            }
        }
        if (update.flags.dsk.auto < 1 && update.flags.dsk.manual == 0)
            return await actor.deleteEmbeddedDocuments("ActiveEffect", [existing.id])
        else
            return await existing.update(update)
    }

    static async updateEffect(actor, existing, value, absolute, auto, newEffect = undefined) {
        const immune = this.immuneToEffect(actor, existing, true)
        if (immune) return immune
        let delta, newValue
        let update
        if (auto) {
            newValue = Math.min(existing.flags.dsk.max, absolute ? value : existing.flags.dsk.auto + value)
            delta = newValue - existing.flags.dsk.auto
            update = { flags: { dsk: { auto: newValue, manual: existing.flags.dsk.manual } } }
        } else {
            newValue = absolute ? value : existing.flags.dsk.manual + value
            delta = newValue - existing.flags.dsk.manual
            update = { flags: { dsk: { manual: newValue, auto: existing.flags.dsk.auto } } }
        }

        if (delta == 0)
            return existing

        update.flags.dsk.value = Math.max(0, Math.min(existing.flags.dsk.max, update.flags.dsk.manual + update.flags.dsk.auto))
        if (newEffect.duration) {
            update.duration = newEffect.duration
            update.duration.startTime = game.time.worldTime
        }

        await existing.update(update)
        await actor._dependentEffects(existing.flags.core.statusId, existing, delta)
        return existing
    }

    static immuneToEffect(target, effect, silent = true) {
        //TODO add this to effect dropdown
        const immunities = getProperty(target, "system.immunities") || []
        if (immunities.includes(effect.id)) {
            const msg = game.i18n.format("dsk.DSKError.immuneTo", { name: target.name, condition: game.i18n.localize(`dsk.CONDITION.${effect.id}`) })
            if (ui.notifications && !silent) ui.notifications.warn(msg)
            return msg
        }
        return false
    }

    static resistantToEffect(target, effect) {
        const effectId = getProperty(effect, "flags.core.statusId")
        if (!effectId) return 0

        const resistances = getProperty(target, "system.resistances.effects") || []
        return resistances.reduce((res, val) => {
            if (val.target == effectId) res += Number(val.value)
            return res
        }, 0)
    }

    static hasCondition(target, conditionKey) {
        if (target != undefined && conditionKey) {
            if (!target.effects) return false

            return target.effects.find(i => getProperty(i, "flags.core.statusId") == conditionKey)
        }
        return false
    }

    static prepareActiveEffects(target, data) {
        let systemConditions = duplicate(CONFIG.statusEffects) //.filter(x => x.flags.dsk.editable)
        let appliedSystemConditions = []
        data.conditions = []
        data.transferedConditions = []
        for (let condition of target.effects.filter(e => { return game.user.isGM || target.documentName == "Item" || !e.getFlag("dsk", "hidePlayers") })) {
            condition.disabled = condition.disabled
            condition.boolean = condition.getFlag("dsk", "value") == null
            condition.label = condition.label
            condition.icon = condition.icon
            const statusId = condition.getFlag("core", "statusId")
            if (statusId) {
                condition.value = condition.getFlag("dsk", "value")
                condition.editable = condition.getFlag("dsk", "editable")
                condition.descriptor = statusId
                condition.manual = condition.getFlag("dsk", "manual")
                appliedSystemConditions.push(statusId)
            }
            if ((condition.origin == target.uuid || !condition.origin) && !condition.notApplicable)
                data.conditions.push(condition)
            else if (!condition.notApplicable) {
                data.transferedConditions.push(condition)
            }
        }
        data.manualConditions = systemConditions.filter(x => !appliedSystemConditions.includes(x.id))

        const cumulativeConditions = []
        for(let key of Object.keys(target.system?.status || {})) {
          if(target.system.status[key]){
            const ef = DSK.statusEffects.find(x => x.id == key)
            cumulativeConditions.push({
              icon: ef.icon,
              id: key,
              label: game.i18n.localize(ef.label),
              value: target.system.status[key]
            })
          }
        }
        data.cumulativeConditions = cumulativeConditions
    }

    static calculateRollModifier(effectId, actor, item, options = {}) {
        if (item.type == "regenerate") return 0

        return -1 * (actor.system.status[effectId] || 0)
    }

    static ModifierIsSelected(item, options = {}, actor) {
        return options.mode != "damage"
    }

    static getRollModifiers(actor, item, options = {}) {
        const source = game.i18n.localize('dsk.status') + "/" + game.i18n.localize('dsk.condition')
        const actorEffects = []
        for(let key of Object.keys(actor.system.status)){
            if(actor.system.status[key]){
                const effectClass = game.dsk.config.statusEffectClasses[key] || DSKStatusEffects
                actorEffects.push({
                    name: game.i18n.localize(`dsk.CONDITION.${key}`),
                    value: effectClass.calculateRollModifier(key, actor, item, options),
                    selected: effectClass.ModifierIsSelected(item, options, actor),
                    source
                })
            }   
        }
        return actorEffects
    }
}

class EncumberedEffect extends DSKStatusEffects {
    static ModifierIsSelected(item, options = {}, actor) {
        const burdenedSkill = item.type == "skill" && item.system.encumbers == "yes"
        const attack = !["skill", "ahnengabe", "rangeweapon"].includes(item.type) && options.mode != "damage"
        return burdenedSkill || attack
    }

    static calculateRollModifier(effectId, actor, item, options = {}) {
        if (item.type == "regenerate") return 0
        return (item.type == "skill" && item.system.encumbers == "no") ? 0 : super.calculateRollModifier(effectId, actor, item, options)
    }
}

class PainEffect extends DSKStatusEffects {
    static ModifierIsSelected(item, options = {}, actor) {
        return actor.effects.find(x => getProperty(x, "flags.core.statusId") == "bloodrush") == undefined
    }
}

class SelfconfidenceEffect extends DSKStatusEffects {
    static calculateRollModifier(effectId, actor, item, options = {}) {
        if (item.type == "regenerate") return 0
        return actor.system.status.selfconfidence || 0
    }
}

DSK.statusEffectClasses = {
    encumbered: EncumberedEffect,
    inpain: PainEffect,
    selfconfidence: SelfconfidenceEffect
}