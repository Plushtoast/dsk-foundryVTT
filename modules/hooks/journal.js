export function setupJournal(){
    Hooks.on("getJournalSheetHeaderButtons", (sheet, buttons) => {
        if (!sheet.document.sceneNote) return

        buttons.unshift({
            class: "panMapNote",
            icon: "fas fa-map-pin",
            onclick: async() => sheet.document.panToNote()
        })
    })
}