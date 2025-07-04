const { mergeObject } = foundry.utils

export default class DSKJournalSheet extends foundry.appv1.sheets.JournalSheet{
    static get defaultOptions(){
        const optns = super.defaultOptions
        mergeObject(optns, {
            classes: optns.classes.concat(["dsk", "dskjournal"])
        })
        return optns
    }
}