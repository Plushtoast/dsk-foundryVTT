import ActorDSK from "../actor/actor_dsk.js"
import DSKDialog from "../dialog/dialog-dsk.js"
import ItemDSK from "../item/item_dsk.js"
import DSKActiveEffectConfig from "../status/active_effects.js"
import DSKStatusEffects from "../status/status_effects.js"
import DSKTables from "../tables/dsktables.js"
import AdvantageRulesDSK from "./advantage-rules.js"
import DSK from "./config.js"
import DSKSoundEffect from "./dsk-soundeffect.js"
import DSKUtility from "./dsk_utility.js"
import RequestRoll from "./request-roll.js"
import SpecialabilityRulesDSK from "./specialability-rules.js"
import TraitRulesDSK from "./trait_rules.js"

export default class DiceDSK{
    static async setupDialog({ dialogOptions, testData, cardOptions }) {
        let rollMode = await game.settings.get("core", "rollMode")
        let sceneStress = 0

        if (typeof testData.source.toObject === "function") testData.source = testData.source.toObject(false)

        mergeObject(testData, {
            testDifficulty: sceneStress,
        })

        mergeObject(dialogOptions.data, {
            testDifficulty: sceneStress,
            testModifier: dialogOptions.data.modifier || 0,
        })

        let situationalModifiers = dialogOptions.data.situationalModifiers || (testData.extra.actor ? DSKStatusEffects.getRollModifiers(testData.extra.actor, testData.source) : [])
        
        if (testData.extra.options.moreModifiers != undefined) {
            situationalModifiers.push(...testData.extra.options.moreModifiers)
        }

        let targets = []
        game.user.targets.forEach((target) => {
            if (target.actor) targets.push({ name: target.actor.name, id: target.id, img: target.actor.img })
        })

        mergeObject(dialogOptions.data, {
            hasSituationalModifiers: situationalModifiers.length > 0,
            situationalModifiers,
            rollMode: dialogOptions.data.rollMode || rollMode,
            rollModes: CONFIG.Dice.rollModes,
            defenseCount: await this.getDefenseCount(testData),
            targets,
        })
        mergeObject(cardOptions, {
            user: game.user.id,
        })

        if (!testData.extra.options.bypass) {
            let html = await renderTemplate(dialogOptions.template, dialogOptions.data)
            return new Promise((resolve, reject) => {
                let dialog = DSKDialog.getDialogForItem(testData.source.type)
                new dialog({
                        title: dialogOptions.title,
                        content: html,
                        buttons: dialog.getRollButtons(testData, dialogOptions, resolve, reject),
                        default: "rollButton",
                    })
                    .recallSettings(testData.extra.speaker, testData.source, testData.mode)
                    .render(true)
            })
        } else {
            cardOptions.rollMode = testData.extra.options.rollMode || rollMode
            if (!testData.situationalModifiers) testData.situationalModifiers = []
            return { testData, cardOptions }
        }
    }

    static _appendSituationalModifiers(testData, name, val, type = "") {
        let existing = testData.situationalModifiers.find((x) => x.name == name)

        if (existing) {
            existing.value = val
        } else {
            testData.situationalModifiers.push({
                name,
                value: val,
                type,
            })
        }
    }

    static _situationalPartCheckModifiers(testData) {
        return testData.situationalModifiers.reduce(
            function (_this, val) {
                if (val.type == "TPM") {
                    const pcs = val.value.split("|")
                    if (pcs.length != 2) return _this

                    _this[0] = _this[0] + Number(pcs[0])
                    _this[1] = _this[1] + Number(pcs[1])
                    return _this
                } else {
                    return _this
                }
            },
            [0, 0]
        )
    }

    static _situationalModifiers(testData, filter = "") {
        return testData.situationalModifiers.reduce(function (_this, val) {
            return _this + (val.type == filter || (filter == "" && val.type == undefined) ? Number(val.value) || 0 : 0)
        }, 0)
    }

    static async getDefenseCount(testData) {
        if (game.combat) return await game.combat.getDefenseCount(testData.extra.speaker)
        
        return 0
    }

    static async rollTalent(testData) {
        let res = await this._roll2D20(testData)
        res["rollType"] = "talent"
        return res
    }

    static async rollTest(testData) {
        //testData.function = "rollTest"
        let rollResults
        switch (testData.source.type) {
            case "ahnengabe":
                rollResults = await this.rollSpell(testData)
                break
            case "skill":
                rollResults = await this.rollTalent(testData)
                break
            case "combatskill":
                rollResults = await this.rollCombatskill(testData)
                break
            case "regenerate":
                rollResults = await this.rollRegeneration(testData)
                break
            case "trait":
                rollResults = testData.mode == "damage" ? await this.rollDamage(testData) : await this.rollCombatTrait(testData)
                break
            case "meleeweapon":
            case "rangeweapon":
                rollResults = testData.mode == "damage" ? await this.rollDamage(testData) : await this.rollWeapon(testData)
                break
            case "poison":
                rollResults = await this.rollItem(testData)
                break
            default:
                rollResults = await this.rollAttribute(testData)
        }
        mergeObject(rollResults, deepClone(testData.extra))
        return rollResults
    }

    

    static async rollAttribute(testData) {
        let result = await this._roll2D20(testData)
        result["rollType"] = "attribute"
        return result
    }

    static get2D20SuccessLevel(roll, fws, botch = 20, critical = 1) {
        const critFilter = roll.terms.filter((x) => x.results && x.results[0].result <= critical).length
        const botchFilter = roll.terms.filter((x) => x.results && x.results[0].result >= botch).length
        if (critFilter >= 2) return critFilter
        if (botchFilter >= 2) return botchFilter * -1
        return fws >= 0 ? 1 : -1
    }

    static async _addRollDiceSoNice(testData, roll, color) {
        if (testData.rollMode) {
            for (let i = 0; i < roll.dice.length; i++) {
                mergeObject(roll.dice[i].options, color)
            }
            await this.showDiceSoNice(roll, testData.rollMode)
        }
    }

    static async rollSpell(testData) {
        let res = await this._roll2D20(testData)
        res["rollType"] = testData.source.types
        res.preData.calculatedSpellModifiers.finalcost = Number(res.preData.calculatedSpellModifiers.cost)
        if (res.successLevel >= 2) {
            let extraFps = 10
            res.description = res.description + ", " + game.i18n.localize("dsk.additionalQLs") + " " + extraFps
            res.qualityStep = Math.min(6, Math.ceil(res.result / 5) + 2)
            res.preData.calculatedSpellModifiers.finalcost = Math.round(res.preData.calculatedSpellModifiers.cost / 2)
        } else if (res.successLevel <= -2) {
            res.description += DSKTables.rollCritBotchButton("Ahnen", false, testData)
        }

        if (res.successLevel > 0) {
            if (testData.source.system.effectFormula != "") {
                let formula = testData.source.system.effectFormula
                    .replace(game.i18n.localize("dsk.CHARAbbrev.QS"), res.qualityStep)
                    .replace(/[Ww]/g, "d")
                let armorPen = []
                for (let mod of testData.situationalModifiers) {
                    if (mod.armorPen) armorPen.push(mod.armorPen)
                }
                if (/(,|;)/.test(formula)) formula = formula.split(/[,;]/)[res.qualityStep - 1]

                let rollEffect = testData.damageRoll ? 
                    Roll.fromData(testData.damageRoll) : 
                    await DiceDSK.manualRolls(
                        await new Roll(formula).evaluate({ async: true }),
                        "dsk.CHAR.DAMAGE",
                        testData.extra.options
                    )
                
                this._addRollDiceSoNice(
                    testData,
                    rollEffect,
                    game.dsk.apps.DiceSoNiceCustomization.getAttributeConfiguration("damage")
                )
                res["calculatedEffectFormula"] = formula
                for (let k of rollEffect.terms) {
                    if (k instanceof Die || k.class == "Die")
                        for (let l of k.results)
                            res["characteristics"].push({ char: "effect", res: l.result, die: "d" + k.faces })
                }
                const damageBonusDescription = []
                const statusDmg = await DiceDSK._stringToRoll(
                    testData.extra.actor.system.spellStats.damage,
                    testData
                )
                if (statusDmg != 0) {
                    damageBonusDescription.push(game.i18n.localize("dsk.statuseffects") + " " + statusDmg)
                }
                res["armorPen"] = armorPen
                res["damageRoll"] = damageRoll.toJSON()
                res["damage"] = rollEffect.total + statusDmg
                res["damagedescription"] = damageBonusDescription.join("\n")
            }
        }

        this.calculateEnergyCost(res, testData)

        return res
    }

    static calculateEnergyCost(res, testData) {
        let costModifiers = []
 
        if(res.successLevel < 0){
            const traditions = ["traditionWitch", "traditionFjarning", "braniborian"].map(x => game.i18n.localize(`dsk.LocalizedIDs.${x}`))
            const factor = testData.extra.actor.items.some(x => x.type == "specialability" && traditions.includes(x.name)) ? 3 : 2
            res.preData.calculatedSpellModifiers.finalcost = Math.round(res.preData.calculatedSpellModifiers.finalcost / factor)
        }
        let feature = "AePCost"
        let weakBody = game.i18n.localize("dsk.LocalizedIDs.weakAstralBody")
        let energy = game.i18n.localize(`dsk.LocalizedIDs.${res.successLevel > 0 ? "energyControl" : "smallEnergyControl"}`)
        let globalMod = { val: "aepModifier", name: "AeP" }
        
        costModifiers.push(
            {
                name: weakBody,
                value: AdvantageRulesDSK.vantageStep(testData.extra.actor, weakBody),
            },
            {
                name: energy,
                value: SpecialabilityRulesDSK.abilityStep(testData.extra.actor, energy) * -1,
            },
            {
                name: `${game.i18n.localize("dsk.statuseffects")} (${game.i18n.localize("dsk.CHARAbbrev." + globalMod.name)})`,
                value: testData.extra.actor.system[globalMod.val] + this._situationalModifiers(testData, feature)
            }
        )
        costModifiers = costModifiers.filter((x) => x.value != 0)
        res.preData.calculatedSpellModifiers.description = costModifiers.map((x) => `${x.name} ${x.value}`).join("\n")
        res.preData.calculatedSpellModifiers.finalcost = Math.max(
            1,
            Number(res.preData.calculatedSpellModifiers.finalcost) + costModifiers.reduce((b, a) => {return b + a.value}, 0)
        )
    }

    static async _stringToRoll(text, testData) {
        const promises = [];
        const regex = /\d{1}[dDwW]\d/g;
        const modText = `${text}`
        modText.replace(regex, function (match) {
            promises.push(new Roll(match.replace(/[Ww]/, "d")).evaluate({ async: true }))
        })
        const data = await Promise.all(promises)
        const rollString = modText.replace(regex, () => {
            const roll = data.shift()
            if (testData){
                DiceDSK._addRollDiceSoNice(
                    testData,
                    roll,
                    game.dsk.apps.DiceSoNiceCustomization.getAttributeConfiguration("ch")
                )
            }
            return roll.total
        })
        return await Roll.safeEval(rollString)
    }

    static async detailedWeaponResult(result, testData, source) {
        if(testData.mode != "attack") return
            switch (result.successLevel) {
                case 2:
                    result.description += DSKTables.defaultAttackCrit(true)
                    result.doubleDamage = true                    
                    break
                case -2:
                    const isMelee = source.type == "meleeweapon" || getProperty(source, "system.traitType") == "meleeAttack"
                    const isWeaponless = getProperty(source, "system.combatskill") == game.i18n.localize("dsk.LocalizedIDs.wrestle") || source.type == "trait"
                    if (isMelee)
                        result.description += DSKTables.rollCritBotchButton("Melee", isWeaponless, testData)
                    else
                        result.description += DSKTables.rollCritBotchButton("Range", false, testData)
                    break
        }
    }

    static async evaluateDamage(testData, result, weapon, isRangeWeapon, doubleDamage) {
        let rollFormula = weapon.system.tp.replace(/[Ww]/g, "d")
        let overrideDamage = []
        let dmgMultipliers = weapon.dmgMultipliers || []
        let damageBonusDescription = dmgMultipliers.map( x => `${x.name} *${x.val}`)
        let armorPen = []
        let bonusDmg = 0
        for(let val of testData.situationalModifiers){
            let number = 0
            if (val.armorPen) armorPen.push(val.armorPen)
            if (val.damageBonus) {
                if (/^\*/.test(val.damageBonus)) {
                    dmgMultipliers.push({ name: val.name, val: Number(val.damageBonus.replace("*", "")) })
                    continue
                }
                const isOverride = /^=/.test(val.damageBonus)
                const rollString = `${val.damageBonus}`.replace(/^=/, "")

                let roll = await DiceDSK._stringToRoll(rollString, testData)
                number = roll * (val.step || 1)

                if (isOverride) {
                    rollFormula = rollString.replace(/[Ww]/, "d")
                    overrideDamage.push({ name: val.name, roll })
                    continue
                } else {
                    val.damageBonus = roll
                    bonusDmg += number
                }
            }
        }

        let damageRoll = testData.damageRoll
            ? Roll.fromData(testData.damageRoll)
            : await DiceDSK.manualRolls(
                  await new Roll(rollFormula).evaluate({ async: true }),
                  "dsk.damage",
                  testData.extra.options
              )
        let damage = damageRoll.total;

        let weaponroll = 0
        for (let k of damageRoll.terms) {
            if (k instanceof Die || k.class == "Die") {
                for (let l of k.results) {
                    weaponroll += Number(l.result)
                    result.characteristics.push({ char: "damage", res: l.result, die: "d" + k.faces })
                }
            }
        }
        let weaponBonus = damage - weaponroll

        if (overrideDamage.length > 0) {
            damageBonusDescription.push(overrideDamage[0].name + " " + damage)
        } else {
            damage += bonusDmg

            damageBonusDescription.push(game.i18n.localize("dsk.Roll") + " " + weaponroll)
            if (weaponBonus != 0) damageBonusDescription.push(game.i18n.localize("dsk.weaponModifier") + " " + weaponBonus)

            testData.situationalModifiers.reduce((prev, x) => {
                if (x.damageBonus) {
                    const value = /^\*/.test(x.damageBonus) ? x.damageBonus : Number(x.damageBonus) * (x.step || 1)
                    damageBonusDescription.push(`${x.name} ${value}`)
                }
            }, damageBonusDescription)

            if (testData.situationalModifiers.find((x) => x.name.indexOf(game.i18n.localize("dsk.CONDITION.bloodrush")) > -1)) {
                damage += 2
                damageBonusDescription.push(game.i18n.localize("dsk.CONDITION.bloodrush") + " " + 2)
            }

            if (weapon.extraDamage) {
                damage = Number(weapon.extraDamage) + Number(damage)
                damageBonusDescription.push(game.i18n.localize("dsk.damageThreshold") + " " + weapon.extraDamage)
            }

            let status
            if (isRangeWeapon) {
                let rangeDamageMod = DSK.rangeMods[testData.rangeModifier || "medium"].damage
                damage += rangeDamageMod
                if (rangeDamageMod != 0) damageBonusDescription.push(game.i18n.localize("dsk.distance") + " " + rangeDamageMod)

                status = testData.extra.actor.system.rangeStats.damage
            } else {
                status = testData.extra.actor.system.meleeStats.damage
            }

            const statusDmg = await DiceDSK._stringToRoll(status, testData)
            if (statusDmg != 0) {
                damage += statusDmg
                damageBonusDescription.push(game.i18n.localize("dsk.statuseffects") + " " + statusDmg)
            }
        }

        const feint = game.i18n.localize("dsk.LocalizedIDs.feint")
        if(result.qualityStep > 0 && !testData.situationalModifiers.find(x => x.name == feint)){
            damage += result.qualityStep
            damageBonusDescription.push(game.i18n.localize("dsk.qualityStep") + " " + result.qualityStep)
        }

        if (doubleDamage) {
            damage = damage * 3
            damageBonusDescription.push(game.i18n.localize("dsk.doubleDamage"))
        }
        for (const el of dmgMultipliers) {
            damage = damage * el.val
        }
        result["armorPen"] = armorPen
        result["damagedescription"] = damageBonusDescription.join(", ")
        result["damage"] = Math.round(damage)
        result["damageRoll"] = damageRoll.toJSON()
    }

    static parseEffect(source) {
        const effectString = source.system.effect ? source.system.effect : undefined
        const result = []
        if (effectString) {
            const regex = /^[a-z]+\|[öäüÖÄÜa-zA-z ]+$/

            for (let k of effectString.split(";")) {
                if (regex.test(k.trim())) {
                    const split = k.split("|").map((x) => x.trim())
                    if (split[0] == "condition") {
                        const effect = CONFIG.statusEffects.find((x) => x.id == split[1])
                        result.push(
                            `<a class="chat-condition chatButton" data-id="${effect.id}">
                            <img src="${effect.icon}"/>${game.i18n.localize(effect.label)}
                            </a>`
                        )
                    } else
                        result.push(
                            `<a class="roll-button roll-item" data-name="${split[1]}" data-type="${
                                split[0]
                            }"><i class="fas fa-dice"></i>${game.i18n.localize(split[0])}: ${split[1]}</a>`
                        )
                }
            }
        }
        const poison = getProperty(source, "flags.dsk.poison")
        if (poison) {
            result.push(
                `<a class="roll-button roll-item" data-removecharge="${!poison.permanent}" data-name="${
                    poison.name
                }" data-type="poison"><i class="fas fa-dice"></i>${game.i18n.localize("ITEM.TypePoison")}: ${poison.name}</a>`
            )
        }
        return result.join(", ")
    }

    static async _roll2D20(testData) {
        let roll = testData.roll ? Roll.fromData(testData.roll) : await new Roll("1d20+1d20").evaluate({ async: true })
        let description = []
        let successLevel = 0

        if(testData.testDifficulty) this._appendSituationalModifiers(testData, game.i18n.localize("dsk.Difficulty"), testData.testDifficulty)

        if(testData.vw){
            const dmmalus = testData.situationalModifiers.reduce((prev, o) => {
                return prev + (Number(o.dmmalus) || 0)
            }, 0)
            const finalVw = Math.max(0, Number(testData.vw) - dmmalus)
            this._appendSituationalModifiers(testData, game.i18n.localize("dsk.ABBR.VW"), -1 * finalVw)
        }
        let modifiers = this._situationalModifiers(testData)
        const pcms = this._situationalPartCheckModifiers(testData, "TPM")
        let basePW = testData.source.attack || Number(testData.source.system.at)
        
        if(!basePW){
            if(testData.source.system.level == undefined){
                basePW = -5 + testData.extra.actor.system.characteristics[testData.source.system.characteristic1].value
                + testData.extra.actor.system.characteristics[testData.source.system.characteristic2].value
            }   
            else{
                basePW = testData.source.system.level + 5 + Math.round((testData.extra.actor.system.characteristics[testData.source.system.characteristic1].value
                    + testData.extra.actor.system.characteristics[testData.source.system.characteristic2].value)/2)
            }
        }

        let pw = basePW + this._situationalModifiers(testData, "FW") 
            + pcms[0] + pcms[1] + modifiers 

        
        
        if(testData.advancedModifiers){
            pw += testData.advancedModifiers.fws + testData.advancedModifiers.chars[0] + testData.advancedModifiers.chars[1]
        }        
        
        let fws = pw - roll.terms[0].results[0].result - roll.terms[2].results[0].result
        let crit = 1
        let botch = 20
        if (
            testData.source.type == "skill" &&
            AdvantageRulesDSK.hasVantage(
                testData.extra.actor,
                `${game.i18n.localize("dsk.LocalizedIDs.incompetent")} (${testData.source.name})`
            )
        ) {
            let reroll = await new Roll("1d20").evaluate({ async: true })
            let indexOfMinValue = res.reduce((iMin, x, i, arr) => (x < arr[iMin] ? i : iMin), 0)
            let oldValue = roll.terms[indexOfMinValue * 2].total
            fws += Math.max(res[indexOfMinValue], 0)
            fws -= Math.max(0, reroll.total - tar[indexOfMinValue])
            roll.editRollAtIndex([{index: indexOfMinValue, val: reroll.total}])
            this._addRollDiceSoNice(testData, reroll, roll.terms[indexOfMinValue * 2].options)
            description.push(
                game.i18n.format("dsk.CHATNOTIFICATION.unableReroll", {
                    die: indexOfMinValue + 1,
                    oldVal: oldValue,
                    newVal: reroll.total,
                })
            )
        }
        let automaticResult = 0
        if (
            testData.source.type == "skill" &&
            TraitRulesDSK.hasTrait(
                testData.extra.actor,
                `${game.i18n.localize("dsk.LocalizedIDs.automaticSuccess")} (${testData.source.name})`
            )
        ) {
            description.push(game.i18n.localize("dsk.LocalizedIDs.automaticSuccess"))
            successLevel = 1
            automaticResult = 1
        } else if (
            testData.source.type == "skill" &&
            TraitRulesDSK.hasTrait(
                testData.extra.actor,
                `${game.i18n.localize("dsk.LocalizedIDs.automaticFail")} (${testData.source.name})`
            )
        ) {
            description.push(game.i18n.localize("dsk.LocalizedIDs.automaticFail"))
            successLevel = -1
        } else {
            successLevel = DiceDSK.get2D20SuccessLevel(roll, fws, botch, crit)
            if(testData.routine) successLevel = 1

            description.push(DiceDSK.getSuccessDescription(successLevel))
        }

        description = description.join(", ")
        let qualityStep = 0

        if (successLevel > 0) {
            fws += this._situationalModifiers(testData, "FP")
            qualityStep = Math.max(1,
                (fws == 0 ? 1 : fws > 0 ? Math.ceil(fws / 5) : 0) +
                (testData.qualityStep != undefined ? Number(testData.qualityStep) : 0))
                + (testData.advancedModifiers?.qls || 0) + this._situationalModifiers(testData, "QL")
        }

        if (qualityStep < automaticResult) qualityStep = automaticResult

        return {
            result: fws,
            characteristics: [0, 1].map((x) => {
                return {
                    char: testData.source.system[`characteristic${x + 1}`],
                    res: roll.terms[x * 2].results[0].result,
                    tar: testData.extra.actor.system.characteristics[testData.source.system[`characteristic${x + 1}`]]?.value
                }
            }),
            qualityStep,
            pw,
            roll,
            description,
            preData: testData,
            successLevel,
            modifiers,
            extra: {},
        }
    }

    static async renderRollCard(chatOptions, testData, rerenderMessage) {
        const applyEffect = this.addApplyEffectData(testData)
        const preData = deepClone(testData.preData)
        const hideDamage = rerenderMessage ? rerenderMessage.flags.data.hideDamage : preData.mode == "attack"
        await Hooks.call("postProcessDSKRoll", chatOptions, testData, rerenderMessage, hideDamage)
        delete preData.extra.actor
        delete testData.actor
        delete testData.preData

        const hasAreaTemplate = testData.successLevel > 0 && preData.source.system.target && (preData.source.system.target.type in game.dsk.config.areaTargetTypes)

        let chatData = {
            title: chatOptions.title,
            testData,
            hideData: game.user.isGM,
            preData,
            hideDamage,
            modifierList: preData.situationalModifiers.filter((x) => x.value != 0),
            applyEffect,
            hasAreaTemplate,
        }

        if (preData.advancedModifiers) {
            if (preData.advancedModifiers.chars.some((x) => x != 0))
                chatData.modifierList.push({
                    name: game.i18n.localize("dsk.MODS.partChecks"),
                    value: preData.advancedModifiers.chars,
                })
            if (preData.advancedModifiers.fws != 0)
                chatData.modifierList.push({ name: game.i18n.localize("dsk.MODS.FW"), value: preData.advancedModifiers.fws })
            if (preData.advancedModifiers.qls != 0)
                chatData.modifierList.push({ name: game.i18n.localize("dsk.MODS.QS"), value: preData.advancedModifiers.qls })
        }

        if (["gmroll", "blindroll"].includes(chatOptions.rollMode))
            chatOptions["whisper"] = game.users.filter((user) => user.isGM).map((x) => x.id)
        if (chatOptions.rollMode === "blindroll") chatOptions["blind"] = true
        else if (chatOptions.rollMode === "selfroll") chatOptions["whisper"] = [game.user.id]

        DSKSoundEffect.playEffect(
            preData.mode,
            preData.source,
            testData.successLevel,
            chatOptions.whisper,
            chatOptions.blind
        )

        chatOptions["flags.data"] = {
            preData,
            postData: testData,
            template: chatOptions.template,
            rollMode: chatOptions.rollMode,
            isOpposedTest: chatOptions.isOpposedTest,
            title: chatOptions.title,
            hideData: chatData.hideData,
            hideDamage: chatData.hideDamage,
            isDSKRoll: true,
        }

        if (!rerenderMessage) {
            chatOptions["content"] = await renderTemplate(chatOptions.template, chatData)
            return await ChatMessage.create(chatOptions, false)
        } else {
            const html = await renderTemplate(chatOptions.template, chatData)
                //Seems to be a foundry bug, after edit inline rolls are not converted anymore
            const actor =
                ChatMessage.getSpeakerActor(rerenderMessage.speaker) ||
                game.users.get(rerenderMessage.user).character
            const rollData = actor ? actor.getRollData() : {}
            const enriched = await TextEditor.enrichHTML(html, {rollData, async: true})
            chatOptions["content"] = enriched

            const postFunction = getProperty(rerenderMessage, "flags.data.preData.extra.options.postFunction")
            if(postFunction){
                testData.messageId = rerenderMessage.id;
                eval(postFunction.functionName)(postFunction, { result: testData }, preData.source)
            }

            const newMsg = await rerenderMessage.update({
                    content: chatOptions["content"],
                    ["flags.data"]: chatOptions["flags.data"],
                })
                
            ui.chat.updateMessage(newMsg)
            return newMsg
        }
    }

    static addApplyEffectData(testData) {
        const source = testData.preData.source
        if (["ahnengabe", "meleeweapon", "rangeweapon"].includes(source.type)) {
            if (testData.successLevel > 0 && source.effects.length > 0) return true
        } else if (["poison"].includes(source.type)) {
            return source.effects.length > 0
        } else if(source.type == "trait" && source.effects.length > 0 && testData.successLevel > 0) return true

        const specAbIds = testData.preData.situationalModifiers.filter((x) => x.specAbId).map((x) => x.specAbId)
        if (specAbIds.length > 0) {
            const specAbs = testData.preData.extra.actor.items.filter((x) => specAbIds.includes(x._id))
            for (const spec of specAbs) {
                if (spec.effects.length > 0) return true
            }
        }

        return false
        
    }

    static getSuccessDescription(successLevel) {
        return game.i18n.localize(["dsk.CriticalFailure", "dsk.Failure", "", "dsk.Success", "dsk.CriticalSuccess"][successLevel + 2])
    }

    static async showDiceSoNice(roll, rollMode) {
        if (DSKUtility.moduleEnabled("dice-so-nice")) {
            let whisper = null
            let blind = false
            switch (rollMode) {
                case "blindroll":
                    blind = true
                    whisper = game.users.filter((user) => user.isGM).map((x) => x.id)
                    break
                case "gmroll":
                    whisper = game.users.filter((user) => user.isGM).map((x) => x.id)
                    break
                case "selfroll":
                    whisper = []
                    break
            }
            const promise = game.dice3d.showForRoll(roll, game.user, true, whisper, blind)
            if (!game.settings.get("dice-so-nice", "immediatelyDisplayChatMessages")) await promise
        }
    }

    static async manualRolls(roll, description = "", options = {}) {
        if (options.cheat || game.settings.get("dsk", "allowPhysicalDice")) {
            if (!options.predefinedResult) {
                let result = false
                let form
                let dice = []
                for (let term of roll.terms) {
                    if (term instanceof Die || term.class == "Die") {
                        for (let res of term.results) {
                            dice.push({ faces: term.faces, val: res.result })
                        }
                    }
                }

                let template = await renderTemplate("systems/dsk/templates/dialog/manualroll-dialog.html", {
                    dice: dice,
                    description,
                });
                [result, form] = await new Promise((resolve, reject) => {
                    new DSKDialog({
                        title: game.i18n.localize(options.cheat ? "dsk.DIALOG.cheat" : "dsk.SETTINGS.allowPhysicalDice"),
                        content: template,
                        default: "ok",
                        buttons: {
                            ok: {
                                icon: '<i class="fa fa-check"></i>',
                                label: game.i18n.localize("dsk.yes"),
                                callback: (dlg) => {
                                    resolve([true, dlg])
                                },
                            },
                            cancel: {
                                icon: '<i class="fas fa-times"></i>',
                                label: game.i18n.localize("dsk.cancel"),
                                callback: () => {
                                    resolve([false, 0])
                                },
                            },
                        },
                    }).render(true)
                })

                if (result) {
                    let changes = []
                    form.find(".dieInput").each(function (index) {
                        let val = Number($(this).val())
                        if (val > 0) changes.push({val, index})
                        index++
                    })
                    roll.editRollAtIndex(changes)
                }
            } else {
                roll.editRollAtIndex(options.predefinedResult)
            }
        }
        return roll
    }

    static _getNarrowSpaceModifier(weapon, testData) {
        if (!testData.narrowSpace) return 0

        if (game.i18n.localize("dsk.LocalizedIDs.Shields") == weapon.system.combatskill) {
            return DSK.narrowSpaceModifiers["shield" + weapon.system.shieldsize][testData.mode]
        } else {
            return DSK.narrowSpaceModifiers["weapon" + weapon.system.rw][testData.mode]
        }
    }


    static async rollCombatTrait(testData) {
        let source = testData.source //.system == undefined ? testData.source : testData.source.system
        const isMelee = source.system.traitType == "meleeAttack"
        let weapon = source
        if (isMelee) {

            this._appendSituationalModifiers(
                testData,
                game.i18n.localize("dsk.narrowSpace"),
                this._getNarrowSpaceModifier(weapon, testData)
            )
        } else {
            this._appendSituationalModifiers(
                testData,
                game.i18n.localize("dsk.distance"),
                DSK.rangeMods[testData.rangeModifier || "medium"].attack
            )
        }
        let result = await this._roll2D20(testData)

        await this.detailedWeaponResult(result, testData, source)
        
        if (testData.mode == "attack" && result.successLevel > 0)
            await DiceDSK.evaluateDamage(testData, result, weapon, !isMelee, result.doubleDamage)

        result["rollType"] = "weapon"
        const effect = DiceDSK.parseEffect(weapon)

        if (effect) result["parsedEffect"] = effect

        return result
    }

    static async rollWeapon(testData) {
        let weapon

        let source = testData.source
        let actor = testData.extra.actor
        const combatskill = source.system.combatskill

        let skill = ActorDSK._calculateCombatSkillValues(
            actor.items.find((x) => x.type == "combatskill" && x.name == combatskill),
            actor.system
        )

        const isMelee = source.type == "meleeweapon"
        if (isMelee) {
            weapon = ActorDSK._prepareMeleeWeapon(source, [skill], testData.extra.actor)

            this._appendSituationalModifiers(
                testData,
                game.i18n.localize("dsk.narrowSpace"),
                this._getNarrowSpaceModifier(weapon, testData)
            )

        } else {
            weapon = ActorDSK._prepareRangeWeapon(source, [], [skill], testData.extra.actor)

            this._appendSituationalModifiers(
                testData,
                game.i18n.localize("dsk.distance"),
                DSK.rangeMods[testData.rangeModifier || "medium"].attack
            )
        }
        let result = await this._roll2D20(testData)

        await this.detailedWeaponResult(result, testData, source)

        if (testData.mode == "attack" && result.successLevel > 0)
            await DiceDSK.evaluateDamage(testData, result, weapon, !isMelee, result.doubleDamage)

        result["rollType"] = "weapon"
        const effect = DiceDSK.parseEffect(weapon)

        if (effect) result["parsedEffect"] = effect

        return result
    }

    static async rollRegeneration(testData) {
        let modifier = this._situationalModifiers(testData)
        let roll = testData.roll
        let chars = []

        let result = {
            rollType: "regenerate",
            preData: testData,
            modifiers: modifier,
            extra: {},
        }

        const attrs = []

        if (testData.regenerateLeP) attrs.push("LeP")
        if (testData.extra.actor.system.isMage && testData.regenerateAeP) attrs.push("AeP")
        let index = 0

        const isSick = testData.extra.actor.effects.some((x) => getProperty(x, "flags.core.statusId") == "sick")
        if (isSick) {
            this._appendSituationalModifiers(testData, game.i18n.localize("dsk.CONDITION.sick"), "*0")
            for (let k of attrs) {
                chars.push({ char: k, res: 0, die: "d6" })
                result[k] = 0
                index += 2
            }
        } else {
            for (let k of attrs) {
                this._appendSituationalModifiers(
                    testData,
                    game.i18n.localize(`dsk.LocalizedIDs.regeneration${k}`),
                    AdvantageRulesDSK.vantageStep(testData.extra.actor, game.i18n.localize(`dsk.LocalizedIDs.regeneration${k}`)),
                    k
                )
                this._appendSituationalModifiers(
                    testData,
                    game.i18n.localize(`dsk.LocalizedIDs.weakRegeneration${k}`),
                    AdvantageRulesDSK.vantageStep(
                        testData.extra.actor,
                        game.i18n.localize(`dsk.LocalizedIDs.weakRegeneration${k}`)
                    ) * -1,
                    k
                )
                this._appendSituationalModifiers(
                    testData,
                    game.i18n.localize(`dsk.LocalizedIDs.advancedRegeneration${k}`),
                    SpecialabilityRulesDSK.abilityStep(
                        testData.extra.actor,
                        game.i18n.localize(`dsk.LocalizedIDs.advancedRegeneration${k}`)
                    ),
                    k
                )
                this._appendSituationalModifiers(
                    testData,
                    `${game.i18n.localize(`CHARAbbrev.${k}`)} ${game.i18n.localize("dsk.Modifier")}`,
                    testData[`${k}Modifier`],
                    k
                )
                this._appendSituationalModifiers(
                    testData,
                    `${game.i18n.localize(`CHARAbbrev.${k}`)} ${game.i18n.localize("dsk.regenerate")}`,
                    testData[`regeneration${k}`],
                    k
                )

                chars.push({ char: k, res: roll.terms[index].results[0].result, die: "d6" })
                result[k] = Math.round(
                    Math.max(
                        0,
                        Number(roll.terms[index].results[0].result) + Number(modifier) + this._situationalModifiers(testData, k)
                    ) * Number(testData.regenerationFactor)
                )
                index += 2
            }
        }

        result["characteristics"] = chars
        return result
    }

    static async rollDices(testData, cardOptions) {
        if (!testData.roll) {
            const d3dColors = game.dsk.apps.DiceSoNiceCustomization.getAttributeConfiguration
            let roll
            switch (testData.source.type) {
                case "char":
                case "ahnengabe":
                case "skill":
                    roll = await new Roll(`1d20+1d20`).evaluate({ async: true })

                    mergeObject(roll.dice[0].options, d3dColors(testData.source.system.characteristic1))
                    mergeObject(roll.dice[1].options, d3dColors(testData.source.system.characteristic2))
                    break
                case "regenerate":
                    const leDie = []

                    if (testData.regenerateLeP ) leDie.push("1d6")
                    if (testData.extra.actor.isMage && testData.regenerateAeP) leDie.push("1d6")

                    roll = await new Roll(leDie.join("+")).evaluate({ async: true })
                    if (testData.regenerateLeP ) mergeObject(roll.dice[0].options, d3dColors("mu"))
                    if (testData.extra.actor.isMage && testData.regenerateAeP) mergeObject(roll.dice[leDie.length - 1].options, d3dColors("ge"))
                    break
                case "meleeweapon":
                case "rangeweapon":
                case "combatskill":
                    if (testData.mode == "damage") {
                        let rollFormula = await this.damageFormula(testData)
                        roll = await new Roll(rollFormula).evaluate({ async: true })
                        for (let i = 0; i < roll.dice.length; i++) mergeObject(roll.dice[i].options, d3dColors("damage"))
                    } else {
                        roll = await new Roll(`1d20+1d20`).evaluate({ async: true })
                        mergeObject(roll.dice[0].options, d3dColors("attack"))
                        mergeObject(roll.dice[1].options, d3dColors("attack"))
                    }
                    break
                case "trait":
                    if (testData.mode == "damage") {
                        let rollFormula = await this.damageFormula(testData)
                        roll = await new Roll(rollFormula).evaluate({ async: true })
                        for (let i = 0; i < roll.dice.length; i++) mergeObject(roll.dice[i].options, d3dColors("damage"))
                    } else {
                        roll = await new Roll(`1d20+1d20`).evaluate({ async: true })
                        mergeObject(roll.dice[0].options, d3dColors("attack"))
                        mergeObject(roll.dice[1].options, d3dColors("attack"))
                    }
                    break
                case "poison":
                case "disease":
                    let pColor = d3dColors("in")
                    roll = await new Roll(`1d20+1d20+1d20`).evaluate({ async: true })
                    mergeObject(roll.dice[0].options, pColor)
                    mergeObject(roll.dice[1].options, pColor)
                    mergeObject(roll.dice[2].options, pColor)
                    break
                default:
                    console.error("Unexpected roll mode")
            }
            roll = await DiceDSK.manualRolls(roll, testData.source.type, testData.extra.options)
            await this.showDiceSoNice(roll, cardOptions.rollMode)
            testData.roll = duplicate(roll)
            testData.rollMode = cardOptions.rollMode
        }
        return testData
    }

    static async damageFormula(testData){
        let weapon
        
        if (testData.source.type == "meleeweapon") {
            const skill = ActorDSK._calculateCombatSkillValues(
                testData.extra.actor.items.find(
                    (x) => x.type == "combatskill" && x.name == testData.source.system.combatskill
                ),
                testData.extra.actor.system
            )
            weapon = ActorDSK._prepareMeleeWeapon(testData.source, [skill], testData.extra.actor)
        } else if (testData.source.type == "rangeweapon") {
            const skill = ActorDSK._calculateCombatSkillValues(
                testData.extra.actor.items.find(
                    (x) => x.type == "combatskill" && x.name == testData.source.system.combatskill
                ),
                testData.extra.actor.system
            )
            weapon = ActorDSK._prepareRangeWeapon(testData.source, [], [skill], testData.extra.actor)
        } else {
            weapon = testData.source.system
        }
        return testData.source.system.tp.replace(/[Ww]/g, "d") + `+${weapon.extraDamage || 0}`
    }

    static async rollDamage(testData) {
        let modifiers = this._situationalModifiers(testData)
        let chars = []

        let roll =  testData.roll
        let damage = roll.total + modifiers

        for (let k of roll.terms) {
            if (k instanceof Die || k.class == "Die") {
                for (let l of k.results) chars.push({ char: testData.mode, res: l.result, die: "d" + k.faces })
            }
        }

        return {
            rollType: "damage",
            damage,
            characteristics: chars,
            preData: testData,
            modifiers,
            extra: {},
        }
    }

    static async _rollEdit(ev) {
        let input = $(ev.currentTarget),
            messageId = input.parents(".message").attr("data-message-id"),
            message = game.messages.get(messageId)

        let data = message.flags.data
        let newTestData = data.preData
        newTestData.extra.actor = DSKUtility.getSpeaker(newTestData.extra.speaker).toObject(false)
        if(newTestData.extra.options.cheat) delete newTestData.extra.options.cheat
        let index

        switch (input.attr("data-edit-type")) {
            case "roll":
                index = input.attr("data-edit-id")
                let newValue = Number(input.val())
                
                if (newTestData.roll.terms.length > index * 2) {
                    let newRoll = Roll.fromData(newTestData.roll)
                    newRoll.editRollAtIndex([{index, val: newValue}])
                    newTestData.roll = newRoll
                } else {
                    let oldDamageRoll = Roll.fromData(data.postData.damageRoll)
                    index = index - newTestData.roll.terms.filter((x) => x.results).length
                    oldDamageRoll.editRollAtIndex([{index, val: newValue}])
                    newTestData.damageRoll = oldDamageRoll
                }
                break
            case "mod":
                index = newTestData.situationalModifiers.findIndex((x) => x.name == game.i18n.localize("dsk.chatEdit"))
                if (index > 0) newTestData.situationalModifiers.splice(index, 1)

                let newVal = {
                    name: game.i18n.localize("dsk.chatEdit"),
                    value: Number(input.val()) - this._situationalModifiers(newTestData),
                }
                newTestData.situationalModifiers.push(newVal)
                break
        }

        let chatOptions = {
            template: data.template,
            rollMode: data.rollMode,
            title: data.title,
            speaker: message.speaker,
            user: message.user.id,
        }

        if (["gmroll", "blindroll"].includes(chatOptions.rollMode))
            chatOptions["whisper"] = game.users.filter((user) => user.isGM).map((x) => x.id)

        if (chatOptions.rollMode === "blindroll") chatOptions["blind"] = true

        if (["poison", "disease"].includes(newTestData.source.type)) {
            new ItemDSK(newTestData.source, { temporary: true })[`${data.postData.postFunction}`](
                { testData: newTestData, cardOptions: chatOptions },
                { rerenderMessage: message }
            )
        } else {
            const speaker = DSKUtility.getSpeaker(message.speaker)
            speaker[`${data.postData.postFunction}`](
                { testData: newTestData, cardOptions: chatOptions },
                { rerenderMessage: message }
            )
        }
    }

    static async chatListeners(html) {
        html.on("click", ".expand-mods", (event) => {
            event.preventDefault()
            let elem = $(event.currentTarget)
            elem.find("i").toggleClass("fa-minus fa-plus")
            elem.siblings("ul,div").fadeToggle()
        })
        html.on("click", ".edit-toggle", (ev) => {
            ev.preventDefault()
            $(ev.currentTarget).parents(".chat-card").find(".display-toggle").toggle()
        })
        html.on("click", ".botch-roll", (ev) => DSKTables.showBotchCard(ev.currentTarget.dataset))
        html.on("click", ".roll-item", (ev) => DiceDSK._itemRoll(ev))
        html.on("change", ".roll-edit", (ev) => DiceDSK._rollEdit(ev))
        html.on("click", ".applyEffect", async(ev) => {
            DiceDSK.wrapLock(ev, async(ev, elem) => { 
                const id = elem.parents(".message").attr("data-message-id")
                const mode = ev.currentTarget.dataset.target
                await DSKActiveEffectConfig.applyEffect(id, mode) 
            })
        })
        html.on("click", ".applyTableEffect", async(ev) => {
            DiceDSK.wrapLock(ev, async(ev, elem) => { 
                const id = elem.parents(".message").attr("data-message-id")
                const mode = ev.currentTarget.dataset.target
                await TableEffects.applyEffect(id, mode) 
            })
        })
        html.on("click", ".placeTemplate", async(ev)=>  MeasuredTemplateDSK.placeTemplateFromChat(ev))
        html.on("click", ".resistEffect", (ev) => DSKActiveEffectConfig.resistEffect(ev))
        html.on("click", ".resistPain", ev => DiceDSK.rollResistPain(ev))
        RequestRoll.chatListeners(html)
    }
}