export function setupConfiguration(){
    game.settings.register("dsk", "migrationVersion", {
        name: "migrationVersion",
        scope: "world",
        config: false,
        default: 1,
        type: Number
    })
    game.settings.register("dsk", "firstTimeStart", {
        name: "firstTimeStart",
        scope: "world",
        config: false,
        default: false,
        type: Boolean
    })
    game.settings.register("dsk", "defaultConfigFinished", {
        name: "defaultConfigFinished",
        scope: "world",
        config: false,
        default: false,
        type: Boolean
    })
    game.settings.register("dsk", "tokenizerSetup", {
        name: "tokenizerSetup",
        scope: "world",
        config: false,
        default: false,
        type: Boolean
    })

    game.settings.register("dsk", "forceLanguage", {
        name: "dsk.SETTINGS.forceLanguage",
        hint: "dsk.SETTINGS.forceLanguageHint",
        scope: "world",
        config: true,
        default: "none",
        type: String,
        choices: {
            "none": "-",
            "de": "German"
        }
    });

    game.settings.registerMenu("dsk", "changelog", {
        name: "Changelog",
        label: "Changelog",
        hint: game.i18n.localize("dsk.SETTINGS.changelog"),
        type: ChangelogForm,
        restricted: false
    })
    game.settings.register("dsk", "disableDidYouKnow", {
        name: "dsk.SETTINGS.disableDidYouKnow",
        hint: "dsk.SETTINGS.disableDidYouKnowHint",
        scope: "client",
        config: true,
        default: false,
        type: Boolean
    });

}

class ChangelogForm extends FormApplication {
    render() {
        //showPatchViewer()
    }
}