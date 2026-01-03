import AdvantageRulesDSK from "../system/advantage-rules.js"
import SpecialabilityRulesDSK from "../system/specialability-rules.js"
import BookWizard from "../wizards/adventure_wizard.js"
import { setupConfiguration } from "./configuration.js"
import { setupKeybindings } from "./keybindings.js"
import { setupScene } from "./scene.js"

export function initSetup(){
    Hooks.once('setup', () => {
        setupConfiguration()
        if (!["de"].includes(game.i18n.lang)) {
            console.warn(`DSK - ${game.i18n.lang} is not a supported language. Falling back to default language.`)
            showForbiddenLanguageDialog()
        } else {
            const forceLanguage = game.settings.get("dsk", "forceLanguage")
            if (["de"].includes(forceLanguage) && game.i18n.lang != forceLanguage) {
                showWrongLanguageDialog(forceLanguage)
            }
        }       

        setupKeybindings()
        setupScene()
        BookWizard.initHook()

        CONFIG.Canvas.lightAnimations.daylight = {
            label: "dsk.LIGHT.daylight",
            illuminationShader: DaylightIlluminationShader
        }

        AdvantageRulesDSK.setupFunctions()
        SpecialabilityRulesDSK.setupFunctions()
    })
}

const showWrongLanguageDialog = (forceLanguage) => {
    foundry.applications.api.DialogV2.wait({
        window: { title: game.i18n.localize("dsk.SETTINGS.forceLanguage") },
        content: game.i18n.format("dsk.DSKError.wrongLanguage", { lang: forceLanguage }),
        buttons: [
            {
                action: "ok",
                icon: "fa fa-check",
                label: game.i18n.localize("dsk.ok"),
                callback: async () => {
                    await game.settings.set("core", "language", forceLanguage)
                    foundry.utils.debouncedReload()
                }
            },
            {
                action: "cancel",
                icon: "fas fa-times",
                label: game.i18n.localize("dsk.cancel"),
            }
        ]
    });
}

const showForbiddenLanguageDialog = () => {
    foundry.applications.api.DialogV2.wait({
        window: { title: game.i18n.localize("language") },
        content: "Your foundry language is not supported by this system. Due to technical reasons your foundry language setting has to be switched to german.",
        buttons: [
            {
                action: "de",
                icon: "fa fa-check",
                label: "de",
                callback: async () => {
                    await game.settings.set("core", "language", "de")
                    foundry.utils.debouncedReload()
                }
            },
            {
                action: "logout",
                icon: "fas fa-door-closed",
                label: game.i18n.localize('SETTINGS.Logout'),
                callback: async () => {
                    ui.menu.items.logout.onClick()
                }
            }
        ],
        close: (event, dialog) => {
            // Only allow closing if language is supported
            if (!["de"].includes(game.i18n.lang)) return false;
            return true;
        }
    });
}

class DaylightIlluminationShader extends foundry.canvas.rendering.shaders.AdaptiveIlluminationShader {
    static fragmentShader =  `
    ${this.SHADER_HEADER}
    ${this.PERCEIVED_BRIGHTNESS}

    void main() {
        ${this.FRAGMENT_BEGIN}
        ${this.TRANSITION}
       
        // Darkness
        framebufferColor = max(framebufferColor, colorBackground);        
        // Elevation
        finalColor = mix(finalColor, max(finalColor, smoothstep( 0.1, 1.0, finalColor ) * 10.0), 1.0) * depth;        
        // Final
        gl_FragColor = vec4(finalColor, 1.0);
      }`;
}