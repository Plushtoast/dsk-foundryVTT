import DSKUtility from "../system/dsk_utility.js"

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
    })
}