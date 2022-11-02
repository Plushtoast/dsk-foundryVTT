import DSKUtility from "./dsk_utility.js"

export default class DSKTutorial {

    static async firstTimeMessage() {
        if (!(await game.settings.get("dsk", "firstTimeStart"))) {
            await DSKTutorial.setupDefaultOptions()
            let msg = game.i18n.localize('dsk.WELCOME')
            ChatMessage.create(DSKUtility.chatDataSetup(msg))
            DSKTutorial.firstTimeLanguage()
            await game.settings.set("dsk", "firstTimeStart", true)
        }
    }

    static firstTimeLanguage() {
        const langs = ["de"]
        let data = {
            title: game.i18n.localize("dsk.DIALOG.firstTime"),
            content: game.i18n.localize("dsk.DIALOG.firstTimeWarning"),
            default: 'de',
            buttons: {}
        }
        for (const lang of langs) {
            data.buttons[lang] = {
                label: game.i18n.localize(lang),
                callback: () => DSKTutorial.setLanguage(lang)
            }
        }

        new Dialog(data).render(true)
    }

    static async setLanguage(lang) {
        await game.settings.set("dsk", "firstTimeStart", true)
        await game.settings.set("dsk", "forceLanguage", lang)
        await game.settings.set("core", "language", lang)
        foundry.utils.debouncedReload()
    }

    static async setupDefaultOptions() {
        const settings = game.settings.get("core", Combat.CONFIG_SETTING)
        settings.skipDefeated = true
        await game.settings.set("core", Combat.CONFIG_SETTING, settings)
        await game.settings.set("core", "leftClickRelease", true)
    }
}