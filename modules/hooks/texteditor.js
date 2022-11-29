import DSK from "../system/config.js"

export function setEnrichers() {
    const rolls = { "Rq": "roll" }
    const icons = { "Rq": "dice" }
    const titles = { "Rq": "" }
    const modRegex = /(-|\+)?\d+/
    const replaceRegex = /\[[a-zA-zöüäÖÜÄ&; -]+/
    const replaceRegex2 = /[\[\]]/g

    if (!DSK.statusRegex) {
        let effects = DSK.statusEffects.map(x => game.i18n.localize(x.label).toLowerCase())
        let keywords = ["dsk.status", "dsk.condition", "dsk.level", "dsk.levels"].map(x => game.i18n.localize(x)).join("|")
        DSK.statusRegex = {
            effects: effects,
            regex: new RegExp(`(${keywords}) (${effects.join('|')})`, 'gi')
        }
    }

    CONFIG.TextEditor.enrichers.push(
        {
            pattern: /@(Rq|Ch)\[[a-zA-zöüäÖÜÄ&; -]+ (-|\+)?\d+\]/g,
            enricher: (match, options) => {
                const str = match[0]
                const type = match[1]
                const mod = Number(str.match(modRegex)[0])
                const skill = str.replace(mod, "").match(replaceRegex)[0].replace(replaceRegex2, "").trim()
                return $(`<a class="roll-button request-${rolls[type]}" data-type="skill" data-modifier="${mod}" data-name="${skill}"><em class="fas fa-${icons[type]}"></em>${titles[type]}${skill} ${mod}</a>`)[0]
            }
        },
        {
            pattern: DSK.statusRegex.regex,
            enricher: (match, options) => {
                return $(conditionsMatcher(match))[0]
            }
        },
        {
            pattern: /@Info\[[a-zA-zöüäÖÜÄ&; -\.0-9]+\]/g,
            enricher: async(match, options) => {
                let uuid = match[0].match(/(?<=\[)(.*?)(?=\])/)[0]
                const item = await fromUuid(uuid)
                if(!item || item.type != "information") return $('<a class="content-link broken"><i class="fas fa-unlink"></i>info</a>')[0]
                if(!game.user.isGM) return $(`<a class="content-link"><i class="fas fa-mask"></i>${game.i18n.localize('dsk.GM notes')}</a>`)[0]

                const templ = await renderTemplate("systems/dsk/templates/items/infopreview.html", { item })
                return $(templ)[0]
            }
        })
}

export function conditionsMatcher(match){
    const str = match[0]
    let parts = str.split(" ")
    const elem = parts.shift()
    parts = parts.join(" ")
    const cond = DSK.statusEffects[DSK.statusRegex.effects.indexOf(parts.toLowerCase())]
    return `<span>${elem} <a class="chatButton chat-condition" data-id="${cond.id}"><img src="${cond.icon}"/>${parts}</a></span>`
}