import DSKUtility from "./dsk_utility.js"
const { mergeObject } = foundry.utils
const { renderTemplate } = foundry.applications.handlebars;

async function setupDefaulTokenConfig() {
    if (!game.settings.get("dsk", "defaultConfigFinished")) {
        console.log("Configuring default token settings")
        let defaultToken = game.settings.get('core', 'prototypeTokenOverrides');

        defaultToken.base.displayName = CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER;
        defaultToken.base.displayBars = CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER;
        defaultToken.base.disposition = CONST.TOKEN_DISPOSITIONS.NEUTRAL;
        defaultToken.bar1 = { attribute: "status.wounds" }
        defaultToken.character.sight.enabled = true;
        await game.settings.set('core', 'prototypeTokenOverrides', defaultToken);
        await game.settings.set("core", "leftClickRelease", true)
        await game.settings.set("dsk", "defaultConfigFinished", true)
        await migrateToV13()
    }
}

async function migrateToV13() {
    const combatTrackerConfig = game.settings.get('core', 'combatTrackerConfig');
    foundry.utils.mergeObject(combatTrackerConfig, {
        turnMarker: {
            src: 'systems/dsk/icons/backgrounds/dasbunteauge.webp',
            animation: 'spin',
        },
    });
    await game.settings.set('core', 'combatTrackerConfig', combatTrackerConfig);
}

async function migrateDSK(currentVersion, migrationVersion) {
    await showPatchViewer()

    if (currentVersion < 29) {
        await migrateToV13();
    }

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
    Hooks.once("ready", async function () {
        setDefaultSkin();
        
        if (!game.user.isGM) return

        //betaWarning()
        await setupDefaulTokenConfig()
        const currentVersion = await game.settings.get("dsk", "migrationVersion")
        const NEEDS_MIGRATION_VERSION = 30
        const needsMigration = currentVersion < NEEDS_MIGRATION_VERSION

        if (!needsMigration) return;

        migrateDSK(currentVersion, NEEDS_MIGRATION_VERSION)
    })
};

async function setDefaultSkin() {
  const uiConfig = game.settings.get('core', 'uiConfig');

  const setDefaults = uiConfig.colorScheme.interface != 'light' || uiConfig.colorScheme.applications != 'light';
  if (!setDefaults) return;

  const proceed = await foundry.applications.api.DialogV2.confirm({
    content: `<p>${_loc('dsk.DSKError.invalidSkinCombination')}</p>`,
    rejectClose: false,
    modal: true
  });
  if (!proceed) return;

  await game.settings.set('core', 'uiConfig', {
    ...uiConfig,
    colorScheme: {
      ...uiConfig.colorScheme,
      interface: 'light',
      applications: 'light',
    },
  });
}

import { DefaultAppv2 } from "../actor/baseapp.js"

class PatchViewer extends DefaultAppv2 {
    constructor(json, app) {
        super(app)
        this.json = json
    }

    static DEFAULT_OPTIONS = {
        classes: ['dsk', 'largeDialog', 'patches'],
        position: {
            width: 740,
            height: 740,
        },
        window: {
            title: 'Changelog',
            resizable: true,
        },
    };

    static PARTS = {
        main: {
            template: 'systems/dsk/templates/system/patchviewer.hbs',
        },
    };

    static TABS = {
        sheet: {
            tabs: [
                { id: 'newcontent', label: 'News' },
                { id: 'changelog', label: 'Changelog' },
                { id: 'content', label: 'dsk.patchViewer.tab.store' },
            ],
            initial: 'newcontent',
        },
    };

    async _prepareContext(_options) {
        const data = await super._prepareContext(_options);
        let version = this.json["notes"][this.json["notes"].length - 1]
        const patchName = this.json["default"].replace(/VERSION/g, version.version)
        let msg = `<h2>CHANGELOG</h2><p>${patchName}. </br><b>Important updates</b>: ${version.text}</p><p>For details or proposals visit our github page at <a href="https://github.com/Plushtoast/dsk-foundryVTT" target="_blank">Github</a> or show the <a style="text-decoration: underline;color:#ff6400;" class="showPatchViewer">Full Changelog in Foundry</a>. Have fun.</p>`
        await ChatMessage.create(DSKUtility.chatDataSetup(msg, "roll"))

        const lang = game.i18n.lang
        const changelog = await renderTemplate(`systems/dsk/lazy/patchhtml/changelog_${lang}_${version.version}.html`)
        const news = await renderTemplate(`systems/dsk/lazy/patchhtml/news_${lang}_${version.version}.html`)

        const prevVersions = [this.json["notes"][this.json["notes"].length - 2]].filter(x => x != undefined)
        const hasPrevVersions = prevVersions.length > 0
        const prevChangeLogs = hasPrevVersions ? await Promise.all(prevVersions.map(async (x) => await renderTemplate(`systems/dsk/lazy/patchhtml/changelog_${lang}_${x.version}.html`))) : []
        const prevNews = hasPrevVersions ? await Promise.all(prevVersions.map(async (x) => await renderTemplate(`systems/dsk/lazy/patchhtml/news_${lang}_${x.version}.html`))) : []
        const modules = await renderTemplate(`systems/dsk/lazy/patchhtml/modules_${lang}.html`)

        return {
            ...data,
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