import DSKSoundEffect from "../system/dsk-soundeffect.js";
import { showPatchViewer } from "../system/migrator.js";

export function setupConfiguration(){
    game.settings.register("dsk", "migrationVersion", {
        name: "migrationVersion",
        scope: "world",
        config: false,
        default: 2,
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
    game.settings.register("dsk", "limitCombatSpecAbs", {
        name: "dsk.SETTINGS.limitCombatSpecAbs",
        hint: "dsk.SETTINGS.limitCombatSpecAbsHint",
        scope: "world",
        config: true,
        default: true,
        type: Boolean
    });
    game.settings.register("dsk", "merchantNotification", {
        name: "dsk.SETTINGS.merchantNotification",
        hint: "dsk.SETTINGS.merchantNotificationHint",
        scope: "world",
        config: true,
        default: "0",
        type: String,
        choices: {
            0: game.i18n.localize('dsk.no'),
            1: game.i18n.localize('dsk.yes'),
            2: game.i18n.localize('dsk.MERCHANT.onlyGM'),
        }
    });
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
    game.settings.register("dsk", "statusEffectCounterColor", {
        name: "dsk.SETTINGS.statusEffectCounterColor",
        hint: "dsk.SETTINGS.statusEffectCounterColorHint",
        scope: "client",
        config: true,
        default: "#FFFFFF",
        type: String
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
    game.settings.register("dsk", `breadcrumbs_${game.world.id}`, {
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
        name: "iniTrackerPosition",
        scope: "client",
        config: false,
        default: {},
        type: Object
    });

    game.settings.register("dsk", "tokenhotbarPosition", {
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

    game.settings.register("dsk", "tokenhotbarSize", {
        name: "dsk.SETTINGS.tokenhotbarSize",
        hint: "dsk.SETTINGS.tokenhotbarSizeHint",
        scope: "client",
        config: true,
        default: 35,
        type: Number,
        range: {
            min: 15,
            max: 100,
            step: 5
        },
        onChange: async(val) => {
            game.dsk.apps.tokenHotbar.constructor.defaultOptions.itemWidth = val
        }
    });

    game.settings.register("dsk", "obfuscateTokenNames", {
        name: "dsk.SETTINGS.obfuscateTokenNames",
        hint: "dsk.SETTINGS.obfuscateTokenNamesHint",
        scope: "world",
        config: true,
        default: "0",
        type: String,
        choices: {
            "0": game.i18n.localize('dsk.no'),
            "1": game.i18n.localize('dsk.SETTINGS.yesNumbered'),
            "2": game.i18n.localize('dsk.SETTINGS.renameNumbered'),
            "3": game.i18n.localize('dsk.yes'),
            "4": game.i18n.localize('dsk.SETTINGS.rename')
        }
    });

    game.settings.register("dsk", "tokenhotbarLayout", {
        name: "dsk.SETTINGS.tokenhotbarLayout",
        hint: "dsk.SETTINGS.tokenhotbarLayoutHint",
        scope: "client",
        config: true,
        default: 0,
        type: Number,
        choices: {
            0: game.i18n.localize('dsk.SETTINGS.tokenhotbarLayout0'),
            2: game.i18n.localize('dsk.SETTINGS.tokenhotbarLayout1'),
            1: game.i18n.localize('dsk.SETTINGS.tokenhotbarLayout2'),
            3: game.i18n.localize('dsk.SETTINGS.tokenhotbarLayout3')
        }
    });
}

class ChangelogForm extends FormApplication {
    render() {
        showPatchViewer()
    }
}

class ResetTokenbar extends FormApplication {
    async render() {
        await game.settings.set("dsk", "tokenhotbarPosition", {})
        await game.settings.set("dsk", "tokenhotbarLayout", 0)
        await game.settings.set("dsk", "tokenhotbarSize", 35)
        game.dsk.apps.tokenHotbar.resetPosition()
        game.dsk.apps.tokenHotbar.render(true)
    }
}