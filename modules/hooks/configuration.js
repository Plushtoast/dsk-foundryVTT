import DSKSoundEffect from "../system/dsk-soundeffect.js";

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
    game.settings.register("dsk", "expandChatModifierlist", {
        name: "dsk.SETTINGS.expandChatModifierlist",
        hint: "dsk.SETTINGS.expandChatModifierlistHint",
        scope: "client",
        config: true,
        default: false,
        type: Boolean
    });
    game.settings.register("dsk", "enableCombatFlow", {
        name: "dsk.SETTINGS.enableCombatFlow",
        hint: "dsk.SETTINGS.enableCombatFlowHint",
        scope: "client",
        config: true,
        default: true,
        type: Boolean,
        onchange: ev => {
            if (game.dsk.apps.initTracker) {
                game.dsk.apps.initTracker.close()
                game.dsk.apps.initTracker = undefined
            }
        }
    });
    game.settings.register("dsk", "sightAutomationEnabled", {
        name: "sightAutomationEnabled",
        scope: "world",
        config: false,
        default: false,
        type: Boolean
    });
    game.settings.register("dsk", "inventorySound", {
        name: "dsk.SETTINGS.inventorySound",
        hint: "dsk.SETTINGS.inventorySoundHint",
        scope: "client",
        config: true,
        default: true,
        type: Boolean
    });
    game.settings.register("dsk", "diceSetup", {
        name: "diceSetup",
        hint: "diceSetup",
        scope: "world",
        config: false,
        default: false,
        type: Boolean
    })
    game.settings.register("dsk", "scrollingFontsize", {
        name: "dsk.SETTINGS.scrollingFontsize",
        hint: "dsk.SETTINGS.scrollingFontsizeHint",
        scope: "client",
        config: true,
        default: 16,
        type: Number,
        range: {
            min: 6,
            max: 50,
            step: 1
        }
    });
    game.settings.register("dsk", "playerCanEditSpellMacro", {
        name: "dsk.SETTINGS.playerCanEditSpellMacro",
        hint: "dsk.SETTINGS.playerCanEditSpellMacroHint",
        scope: "world",
        config: true,
        default: false,
        type: Boolean
    });
    game.settings.register("dsk", "expansionPermissions", {
        name: "expansionPermissions",
        scope: "world",
        config: false,
        default: {},
        type: Object
    });
    game.settings.register("dsk", "breadcrumbs", {
        name: "dsk.SETTINGS.breadcrumbs",
        scope: "client",
        config: false,
        default: "",
        type: String
    });
    game.settings.register("dsk", "soundConfig", {
        name: "dsk.SETTINGS.soundConfig",
        hint: "dsk.SETTINGS.soundConfigHint",
        scope: "world",
        config: true,
        default: "",
        type: String,
        onChange: async() => { DSKSoundEffect.loadSoundConfig() }
    });
    game.settings.register("dsk", "allowPhysicalDice", {
        name: "dsk.SETTINGS.allowPhysicalDice",
        hint: "dsk.SETTINGS.allowPhysicalDiceHint",
        scope: "world",
        config: true,
        default: false,
        type: Boolean
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

    game.settings.register("dsk", "enableCombatPan", {
        name: "dsk.SETTINGS.enableCombatPan",
        hint: "dsk.SETTINGS.enableCombatPanHint",
        scope: "client",
        config: true,
        default: true,
        type: Boolean
    });

    game.settings.register("dsk", "iniTrackerSize", {
        name: "dsk.SETTINGS.iniTrackerSize",
        hint: "dsk.SETTINGS.iniTrackerSizeHint",
        scope: "client",
        config: true,
        default: 70,
        type: Number,
        range: {
            min: 30,
            max: 140,
            step: 5
        },
        onChange: async(val) => {
            game.dsk.apps.tokenHotbar.constructor.defaultOptions.itemWidth = val
        }
    });

    game.settings.register("dsk", "iniTrackerPosition", {
        name: "tokenhotbarPosition",
        scope: "client",
        config: false,
        default: {},
        type: Object
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