export function initTokenHUD() {
    Hooks.on('renderTokenHUD', (app, html, data) => {
        const actor = app.object.actor
        if (actor) {
            if (game.dsk.apps.LightDialog) game.dsk.apps.LightDialog.lightHud(html, actor, data)
        }
        html.find('.control-icon[data-action="target"]').mousedown(ev => {
                if (ev.button == 2) {
                    game.user.updateTokenTargets([]);
                    $(ev.currentTarget).click()
                    ev.preventDefault()
                }
            })
            // Prevent double calling of modifytokenattribute
        html.find(".attribute input").off('change')
    })
}