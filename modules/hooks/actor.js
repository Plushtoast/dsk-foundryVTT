import DSKActiveEffectConfig from "../status/active_effects.js"
import DSKUtility from "../system/dsk_utility.js"

export function initActorHooks() {
    
    Hooks.on("deleteActiveEffect", (effect, options) => {
        if(!DSKUtility.isActiveGM() || options.noHook) return

        const actor = effect.parent
        if (actor && actor.documentName == "Actor") {
            const statusesId = [...effect.statuses][0]
            if (statusesId == "bloodrush") {
                actor.addCondition("stunned", 4, false, false)
                return false
            } else if (statusesId == "dead" && game.combat) {
                actor.markDead(false)
                return false
            }
            DSKActiveEffectConfig.onEffectRemove(actor, effect)

            //todo this might need to go to predelete
            const result = Hooks.call("deleteActorActiveEffect", actor, effect)
            if (result === false) return false
        }
    })

    Hooks.on("updateActor",(actor, updates) => {
        if(!game.user.isGM && actor.limited && hasProperty(updates, "system.merchant.hidePlayer")) ui.sidebar.render(true)
    })

    Hooks.on("dropActorSheetData", (actor, sheet, data) => {
        switch(data.data?.type){
            case "condition":
                actor.addCondition(data.data.payload.id, 1, false, false)
                return false
            case "lookup":
                sheet._handleLookup(data.data)
                return false
            case "fullpack": 
                sheet._addFullPack(data.data)
                return false
        }
    }) 

    Hooks.on("createActiveEffect", (effect, options, user) => {
        checkIniChange(effect)
    })

    Hooks.on("deleteActiveEffect", (effect, options, user) => {
        checkIniChange(effect)
    })

    function checkIniChange(effect){
        if(!game.user.isGM) return

        if(game.combat && effect.changes.some(x => /(system\.stats\.ini|system\.characteristics.mu|system\.characteristics\.ge)/.test(x.key))){
            const actorId = effect.parent.id
            const combatant = game.combat.combatants.find(x => x.actor.id == actorId)
            if(combatant) combatant.recalcInitiative()
        }
    }

    const askForName = async (tokenObject, setting) => {
        const dialogConstructor = game.dsk.apps.AskForNameDialog || AskForNameDialog
        dialogConstructor.getDialog(tokenObject, setting)
    }

    const obfuscateName = async(token, update) => {
        if(!DSKUtility.isActiveGM()) return

        const actor = token.actor
        if(actor.hasPlayerOwner) return

        const setting = Number(game.settings.get("dsk", "obfuscateTokenNames"))
        if (setting == 0 || getProperty(actor, "merchant.merchantType") == "loot") return

        let sameActorTokens = canvas.scene.tokens.filter((x) => x.actor && x.actor.id === actor.id);
        let name = game.i18n.localize("dsk.unknown")
        if ([2,4].includes(setting)) {
            const tokenId = token.id || token._id
            if(!tokenId) return
            
            askForName(token, setting)
            return
        }
        if (sameActorTokens.length > 0 && setting < 3) {
            name = `${sameActorTokens[0].name.replace(/ \d{1,}$/)} ${sameActorTokens.length + 1}`
        }
        update["name"] = name
    }

    Hooks.on('preCreateToken', (token, data, options, userId) => {
        const actor = token.actor
        if (!actor) return;

        let modify = {} 
        if (getProperty(actor, "system.merchant.merchantType") == "loot") {
            mergeObject(modify, { displayBars: 0 })
        } else if (getProperty(actor, "system.config.autoBar")) {
            mergeObject(modify, { bar1: { attribute: "stats.LeP" } })
            
            if (actor.system.isMage) {
                mergeObject(modify, { bar2: { attribute: "stats.AeP" } })
            } else {
                mergeObject(modify, { bar2: { attribute: "tbd" } })
            }
        }
        
        if (getProperty(actor, "system.config.autoSize")) {
            DSKUtility.calcTokenSize(actor, modify)
        }
        
        obfuscateName(token, modify)
        token.updateSource(modify)
    })

    Hooks.on('createToken', (token, options, id) => {
        if(options.noHook) return
        
        obfuscateName(token, {})
    })
}

class AskForNameDialog extends Dialog{
    static async getDialog(tokenObject, setting){
        new Dialog({
            title: game.i18n.localize("dsk.SETTINGS.obfuscateTokenNames"),
            content: `<label for="name">${game.i18n.localize('dsk.SETTINGS.rename')}</label> <input dtype="string" name="name" type="text" value="${tokenObject.actor.name}"/>`,
            default: 'Yes',
            buttons: {
                Yes: {
                    icon: '<i class="fa fa-check"></i>',
                    label: game.i18n.localize("dsk.yes"),
                    callback: async(html) => {
                        const tokenId = tokenObject.id || tokenObject._id
                        let name = html.find('[name="name"]').val()
                        if(setting == 2){
                            let sameActorTokens = canvas.scene.tokens.filter((x) => x.name === name);
                            if (sameActorTokens.length > 0) {
                                name = `${name.replace(/ \d{1,}$/)} ${sameActorTokens.length + 1}`
                            }
                        }
                        const token = canvas.scene.tokens.get(tokenId)
                        await token.update({ name })
                    }
                },
                unknown: {
                    icon: '<i class="fa fa-question"></i>',
                    label: game.i18n.localize("dsk.unknown"),
                    callback: async(html) => {
                        const tokenId = tokenObject.id || tokenObject._id
                        const token = canvas.scene.tokens.get(tokenId)
                        await token.update({ name: game.i18n.localize("dsk.unknown") })
                    }
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize("dsk.cancel")
                }
            }
        }).render(true)
    }
}