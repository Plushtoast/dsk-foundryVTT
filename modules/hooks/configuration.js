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
    game.settings.register("dsk", "diceSetup", {
        name: "diceSetup",
        hint: "diceSetup",
        scope: "world",
        config: false,
        default: false,
        type: Boolean
    })
    game.settings.register("dsk", "expansionPermissions", {
        name: "expansionPermissions",
        scope: "world",
        config: false,
        default: {},
        type: Object
    });
    game.settings.register("dsk", "breadcrumbs", {
        name: "DSASETTINGS.breadcrumbs",
        hint: "DSASETTINGS.breadcrumbsHint",
        scope: "client",
        config: false,
        default: "",
        type: String
    });
    game.settings.register("dsk", "enableItemDropToCanvas", {
        name: "dsk.SETTINGS.enableItemDropToCanvas",
        hint: "dsk.SETTINGS.enableItemDropToCanvasHint",
        scope: "world",
        config: true,
        default: true,
        type: Boolean
    });
    game.settings.register("dsk", "hideEffects", {
        name: "dsk.SETTINGS.hideEffects",
        hint: "dsk.SETTINGS.hideEffectsHint",
        scope: "world",
        config: true,
        default: true,
        type: Boolean
    })
    game.settings.register("dsk", "indexDescription", {
        name: "dsk.SETTINGS.indexDescription",
        scope: "client",
        config: false,
        default: true,
        type: Boolean
    });
    game.settings.register("dsk", "enableDPS", {
        name: "dsk.SETTINGS.enableDPS",
        hint: "dsk.SETTINGS.enableDPSHint",
        scope: "world",
        config: true,
        default: true,
        type: Boolean
    });
    game.settings.register("dsk", "indexWorldItems", {
        name: "dsk.SETTINGS.indexWorldItems",
        scope: "client",
        config: false,
        default: true,
        type: Boolean
    });
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