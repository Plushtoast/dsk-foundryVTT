import ActorSheetDSK from "./actor_sheet_dsk.js";
const { getProperty } = foundry.utils

export default class ActorSheetCreature extends ActorSheetDSK {
    static DEFAULT_OPTIONS = {
        classes: ['dsk', 'actor', 'creature-sheet', 'character-sheet'],
    };

    static PARTS = {
        header: {
            template: 'systems/dsk/templates/actors/creature/creature-header.hbs',
            templates: [
                'systems/dsk/templates/actors/actorv2/avatar.hbs',
                'systems/dsk/templates/actors/parts/rollhead.hbs',
                'systems/dsk/templates/actors/parts/healthbar.hbs'
            ],
        },
        tabs: {
            template: 'systems/dsk/templates/actors/actorv2/tabs.hbs',
            id: "tabs",
            templates: [
                "systems/dsk/templates/system/dsktabs.hbs"
            ],
        },
        combat: {
            template: 'systems/dsk/templates/actors/creature/creature-combat.hbs',
            scrollable: [''],
        },
        skills: {
            template: 'systems/dsk/templates/actors/actor-talents.hbs',
            scrollable: [''],
        },
        magic: {
            template: 'systems/dsk/templates/actors/creature/creature-magic.hbs',
            scrollable: [''],
        },
        status: {
            template: 'systems/dsk/templates/actors/parts/status_effects.hbs',
            scrollable: [''],
        },
        notes: {
            template: 'systems/dsk/templates/actors/creature/creature-notes.hbs',
            scrollable: [''],
        },
        main: {
            template: 'systems/dsk/templates/actors/creature/creature-main.hbs',
            scrollable: [''],
        },
        inventory: {
            template: 'systems/dsk/templates/actors/creature/creature-loot.hbs',
            scrollable: [''],
        },
    }

    static LIMITEDPARTS = {
        header: {
            template: 'systems/dsk/templates/actors/creature/creature-limited-header.hbs',
        },
        main: {
            template: 'systems/dsk/templates/actors/creature-limited.hbs',
            scrollable: ['']
        },
        notes: {
            template: 'systems/dsk/templates/actors/creature/creature-notes.hbs',
            scrollable: [''],
        },
    }

    async _prepareContext(options) {
        const data = await super._prepareContext(options);        
        data.enrichedBehaviour = await foundry.applications.ux.TextEditor.enrichHTML(getProperty(this.actor.system, "notes.fight"), {secrets: this.actor.isOwner })
        data.enrichedSpecialrules = await foundry.applications.ux.TextEditor.enrichHTML(getProperty(this.actor.system, "notes.specialRules"), {secrets: this.actor.isOwner })
        return data;
    }

    async _cleverDeleteItem(itemId) {
        let item = this.actor.items.find(x => x.id == itemId)
        switch (item.type) {
            case "trait":
                await this._updateAPs(item.system.ap * -1, {}, { render: false })
                break;
        }
        await super._cleverDeleteItem(itemId)
    }

    async _addTrait(item) {
        let res = this.actor.items.find(i => i.type == "trait" && i.name == item.name);
        if (!res) {
            await this._updateAPs(item.system.ap, {}, { render: false })
            //await TraitRulesDSA5.traitAdded(this.actor, item)
            await this.actor.createEmbeddedDocuments("Item", [item]);
        }
    }

    async _onDropItemCreate(itemData) {
        if(itemData.type == "trait") return this._addTrait(itemData)

        return super._onDropItemCreate(itemData)
    }
}