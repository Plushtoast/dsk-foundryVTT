import { setupConfiguration } from "./configuration.js"
import { setupKeybindings } from "./keybindings.js"

export function initSetup(){
    Hooks.once('setup', () => {
        setupConfiguration()
        if (!["de", "en"].includes(game.i18n.lang)) {
            console.warn(`DSK - ${game.i18n.lang} is not a supported language. Falling back to default language.`)
            game.settings.set("core", "language", "de").then(()=> foundry.utils.debouncedReload())
        }
        const forceLanguage = game.settings.get("dsk", "forceLanguage")
        if (["de", "en"].includes(forceLanguage) && game.i18n.lang != forceLanguage) {
            showWrongLanguageDialog(forceLanguage)
        }

        setupKeybindings()
    })
}

const showWrongLanguageDialog = (forceLanguage) => {
    let data = {
        title: game.i18n.localize("dsk.SETTINGS.forceLanguage"),
        content: game.i18n.format("DSAError.wrongLanguage", { lang: forceLanguage }),
        buttons: {
            ok: {
                icon: '<i class="fa fa-check"></i>',
                label: game.i18n.localize("ok"),
                callback: async() => { 
                    await game.settings.set("core", "language", forceLanguage) 
                    foundry.utils.debouncedReload()
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: game.i18n.localize("cancel"),

            }
        }
    }
    new Dialog(data).render(true)
}