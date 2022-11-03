export function setupHandlebars(){
    Handlebars.registerHelper({
        roman: (a, max) => {
            if (max != undefined && Number(max) < 2) return ''

            const roman = [' I', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X']
            return roman[a - 1]
        },
        itemCategory: (a) => {
            return game.i18n.localize(`ITEM.Type${a.slice(0,1).toUpperCase()}${a.slice(1)}`)
        }
    })
}