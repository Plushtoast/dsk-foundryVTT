import DSKUtility from "./dsk_utility.js"

export default class DSKTutorial {

    static async firstTimeMessage() {
        if (!(await game.settings.get("dsk", "firstTimeStart"))) {
            await DSKTutorial.setupDefaultOptions()
            let msg = _loc('dsk.WELCOME')
            ChatMessage.create(DSKUtility.chatDataSetup(msg))
            DSKTutorial.firstTimeLanguage()
            await game.settings.set("dsk", "firstTimeStart", true)
        }
    }

    static firstTimeLanguage() {
        const langs = ["de"]
        const buttons = langs.map(lang => ({
            action: lang,
            label: _loc(lang),
            callback: () => DSKTutorial.setLanguage(lang)
        }));

        foundry.applications.api.DialogV2.wait({
            window: { title: "dsk.DIALOG.firstTime" },
            content: _loc("dsk.DIALOG.firstTimeWarning"),
            buttons: buttons
        });
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