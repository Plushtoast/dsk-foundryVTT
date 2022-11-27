import DSKUtility from "../system/dsk_utility.js"

const modifierTypes = {
    "": "dsk.Modifier",
    "defenseMalus": "dsk.MODS.defenseMalus",
    "FW": "dsk.MODS.FW",
    "AeP": "dsk.AeP",
    "FP": "dsk.MODS.FP",
    "QL": "dsk.MODS.QS",
    "dmg": "dsk.MODS.damage",
    "damageBonus": "dsk.MODS.damage",
    "armorPen": "dsk.MODS.armorPen",
    "TPM": "dsk.MODS.partChecks"
}

export function setupHandlebars(){
    Handlebars.registerHelper({
        roman: (a, max) => {
            if (max != undefined && Number(max) < 2) return ''

            const roman = [' I', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X']
            return roman[a - 1]
        },
        itemCategory: (a) => {
            return DSKUtility.categoryLocalization(a)
        },
        diceThingsUp: (a, b) => DSKUtility.replaceDies(a, false),
        concat: (...values) => { return HandlebarsHelpers.concat(...values).string },
        replaceConditions: DSKUtility.replaceConditions,
        attrLoc: (a, b) => { return game.i18n.localize(`dsk.characteristics.${a}.${b}`)},
        floor: (a) => Math.floor(Number(a)),
        situationalTooltip: (mod) => {
            const key = game.i18n.localize(`dsk.${modifierTypes[mod.type] || "Modifier"}`)
            let res = `${mod.name}<br/>${key}: ${mod.value}`
            if(mod.source){
                res += `<br/>${game.i18n.localize('dsk.source')}: ${mod.source}`
            }
            return res
        },
    })
}