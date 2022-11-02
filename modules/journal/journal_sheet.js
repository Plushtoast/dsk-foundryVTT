export default class DSKJournalSheet extends JournalSheet{
    static get defaultOptions(){
        const optns = super.defaultOptions
        mergeObject(optns, {
            classes: optns.classes.concat(["dsk", "dskjournal"])
        })
        return optns
    }
}