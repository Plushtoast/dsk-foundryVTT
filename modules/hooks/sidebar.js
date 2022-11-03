export function initSidebar(){
    Hooks.on("renderSettings", (app, html, data) => {
        let button = $(`<button id="reportADSKBug"><i class="fas fa-bug"></i> ${game.i18n.localize("dsk.DSKError.reportBug")}</button>`)
        button.click(() => { window.open("https://github.com/Plushtoast/dsk-foundryVTT/issues", "_blank") })
        html.find("#settings-documentation").append(button)

        button = $(`<button class="fshopButton"><div></div> F-Shop</button>`)
        button.click(() => { window.open(game.i18n.localize("dsk.fshopLink"), "_blank") })
        html.find("#settings-documentation").append(button)

        const systemName = game.system.title.split("/")[game.i18n.lang == "de" ? 0 : 1]
        const version = html.find('#game-details .system span').html()
        html.find('#game-details .system').html(`${systemName}<span>${version}</span>`)
    })

    Hooks.on("renderCompendiumDirectory", (app, html, data) => {
        const button = $(`<button id="openLibrary"><i class="fas fa-university"></i>${game.i18n.localize("dsk.ItemLibrary")}</button>`);
        const headerActions = html.find(".header-actions")
        headerActions.append(button);
        button.click(() => { game.dsk.itemLibrary.render(true) })

        const toRemove = game.i18n.lang == "de" ? "en" : "de"
        const packsToRemove = game.packs.filter(p => getProperty(p.metadata, "flags.dsklang") == toRemove)

        for (let pack of packsToRemove) {
            let name = `${pack.metadata.packageName}.${pack.metadata.name}`
            game.packs.delete(name)
            html.find(`li[data-pack="${name}"]`).hide()
        }

        const search = $(`
        <div class="header-search flexrow">
            <i class="fas fa-search"></i>
            <input type="search" name="search" value="" placeholder="${game.i18n.localize('searchCompendium')}" autocomplete="off">
            <a></a>
        </div>`)
        headerActions.after(search)
        search.find('[name="search"]').keyup(ev => {
            const isSearch = ev.currentTarget.value.toLowerCase()
            for(let el of html.find(".compendium-pack")){
                const title = $(el).find('.pack-title').text().trim().toLowerCase()
                const label = $(el).find('footer span:nth-child(2)').text().trim().toLowerCase()
                el.style.display = (!isSearch || title.indexOf(isSearch) >= 0 || label.indexOf(isSearch) >= 0 ) ? "block" : "none";
            }
        })
    })
}