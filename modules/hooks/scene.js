const { getProperty } = foundry.utils

export function setupScene() {
    Hooks.on('preCreateScene', function(doc, createData, options, userId) {
        if (!createData.grid?.units) doc.updateSource({ grid: { units: _loc('dsk.gridUnits') }})

        if(!options.dskInit && createData.notes?.some(x => getProperty(x, "flags.dsk.initName"))){
            ui.notifications.warn('dsk.DSKError.mapsViaJournalbrowser', { localize: true })
        }
    })

    Hooks.on('preCreateActiveEffect', function(doc, createData, options, userId) {
        if (doc.parent.documentName != "Actor") return

        let update = { start: { time: game.time.worldTime } }

        if (!game.combat) {
            doc.updateSource(update)
            return
        }

        update.start.combat = game.combat.id
        update.start.round = game.combat.round
        update.start.turn = game.combat.turn
        doc.updateSource(update)
    })
}