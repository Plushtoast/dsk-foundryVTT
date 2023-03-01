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
    let data = {
        title: game.i18n.localize("dsk.SETTINGS.forceLanguage"),
        content: game.i18n.format("dsk.DSKError.wrongLanguage", { lang: forceLanguage }),
        buttons: {
            ok: {
                icon: '<i class="fa fa-check"></i>',
                label: game.i18n.localize("dsk.ok"),
                callback: async() => { 
                    await game.settings.set("core", "language", forceLanguage) 
                    foundry.utils.debouncedReload()
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: game.i18n.localize("dsk.cancel"),

            }
        }
    }
    new Dialog(data).render(true)
}

class ForbiddenLanguageDialog extends Dialog{
    async close(options = {}){
        if(!["de"].includes(game.i18n.lang)) return

        return super.close(options)
    }
}

const showForbiddenLanguageDialog = () => {
    let data = {
        title: game.i18n.localize("language"),
        content: "Your foundry language is not supported by this system. Due to technical reasons your foundry language setting has to be switched to german.",
        buttons: {
            de: {
                icon: '<i class="fa fa-check"></i>',
                label: "en",
                callback: async() => { 
                    await game.settings.set("core", "language", "de") 
                    foundry.utils.debouncedReload()
                }
            },
            logout: {
                icon: '<i class="fas fa-door-closed"></i>',
                label: game.i18n.localize('SETTINGS.Logout'),
                callback: async() => { 
                    ui.menu.items.logout.onClick()
                }
            }            
        }
    }

    new ForbiddenLanguageDialog(data).render(true)
}

class DaylightIlluminationShader extends AdaptiveIlluminationShader {
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