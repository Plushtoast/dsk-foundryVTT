import DSKUtility from "./dsk_utility.js"

async function setupDefaulTokenConfig() {
    if (!game.settings.get("dsk", "defaultConfigFinished")) {
        console.log("Configuring default token settings")
        let defaultToken = game.settings.get("core", "defaultToken")

        defaultToken.displayName = CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER
        defaultToken.displayBars = CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER
        defaultToken.disposition = CONST.TOKEN_DISPOSITIONS.NEUTRAL
        defaultToken.bar1 = { attribute: "status.wounds" }
        await game.settings.set("core", "defaultToken", defaultToken)
        await game.settings.set("core", "leftClickRelease", true)
        await game.settings.set("dsk", "defaultConfigFinished", true)
    }
}

async function migrateDSK(currentVersion, migrationVersion) {
    await showPatchViewer()
    await game.settings.set("dsk", "migrationVersion", migrationVersion)
}

export async function showPatchViewer() {
    const notes = await fetch("systems/dsk/lazy/updatenotes.json")
    const json = await notes.json()
    const patchViewer = new PatchViewer(json)
    patchViewer.render(true)
}


function betaWarning() {
    const msg = "This is the beta version for DSK for Foundry v10. You might encounter on or more issues. Please report those on the official DSK Github. Thank you."
    ChatMessage.create(DSKUtility.chatDataSetup(msg));
}

export default function migrateWorld() {
    Hooks.once("ready", async function() {
        if (!game.user.isGM) return

        await setupDefaulTokenConfig()
        const currentVersion = await game.settings.get("dsk", "migrationVersion")
        const NEEDS_MIGRATION_VERSION = 21
        const needsMigration = currentVersion < NEEDS_MIGRATION_VERSION

        if (!needsMigration) return;

        migrateDSK(currentVersion, NEEDS_MIGRATION_VERSION)
    })
};

class PatchViewer extends Application {
    constructor(json, app) {
        super(app)
        this.json = json
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.tabs = [{ navSelector: ".tabs", contentSelector: ".content", initial: "newcontent" }]
        mergeObject(options, {
            classes: options.classes.concat(["dsk", "largeDialog", "patches"]),
            width: 740,
            height: 740,
            title: "Changelog"
        });
        options.template = 'systems/dsk/templates/system/patchviewer.html'
        options.resizable = true
        return options;
    }
    
    async getData() {
        let version = this.json["notes"][this.json["notes"].length - 1]
        const patchName = this.json["default"].replace(/VERSION/g, version.version)
        let msg = `<h1>CHANGELOG</h1><p>${patchName}. </br><b>Important updates</b>: ${version.text}</p><p>For details or proposals visit our github page at <a href="https://github.com/Plushtoast/dsk-foundryVT" target="_blank">Github</a> or show the <a style="text-decoration: underline;color:#ff6400;" class="showPatchViewer">Full Changelog in Foundry</a>. Have fun.</p>`
        await ChatMessage.create(DSKUtility.chatDataSetup(msg, "roll"))

        const lang = game.i18n.lang
        const changelog = await renderTemplate(`systems/dsk/lazy/patchhtml/changelog_${lang}_${version.version}.html`)
        const news = await renderTemplate(`systems/dsk/lazy/patchhtml/news_${lang}_${version.version}.html`)

        const prevVersions = [this.json["notes"][this.json["notes"].length - 2]]
        const prevChangeLogs = await Promise.all(prevVersions.map(async(x) => await renderTemplate(`systems/dsk/lazy/patchhtml/changelog_${lang}_${x.version}.html`)))
        const prevNews = await Promise.all(prevVersions.map(async(x) => await renderTemplate(`systems/dsk/lazy/patchhtml/news_${lang}_${x.version}.html`)))
        const modules = await renderTemplate(`systems/dsk/lazy/patchhtml/modules_${lang}.html`)

        return {
            patchName,
            changelog,
            news,
            prevVersions,
            prevChangeLogs,
            prevNews,
            modules
        }
    }
}