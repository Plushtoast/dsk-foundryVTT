import ActorSheetDSK from "./actor_sheet_dsk.js";
const { getProperty } = foundry.utils

export default class ActorSheetCreature extends ActorSheetDSK {
    static DEFAULT_OPTIONS = {
        classes: ['dsk', 'actor', 'creature-sheet', 'character-sheet'],
    };

    static PARTS = {
        main: {
            template: "systems/dsk/templates/actors/creature-sheet.hbs",
            scrollable: [''],
        },
        limited: {
            template: "systems/dsk/templates/actors/creature-limited.hbs",
            scrollable: [''],
        },
    };

    get template() {
        if (this.showLimited()) return ActorSheetCreature.PARTS.limited.template;
        return ActorSheetCreature.PARTS.main.template;
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