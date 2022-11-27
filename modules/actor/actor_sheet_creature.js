import ActorSheetDSK from "./actor_sheet_dsk.js";

export default class ActorSheetCreature extends ActorSheetDSK{
    static get defaultOptions() {
        const options = super.defaultOptions;
        mergeObject(options, { classes: options.classes.concat(["dsk", "actor", "creature-sheet", "character-sheet"]) });
        return options;
    }

    get template() {
        if (this.showLimited()) return "systems/dsk/templates/actors/creature-limited.html";
        return "systems/dsk/templates/actors/creature-sheet.html";
    }

    async getData(options) {
        const data = await super.getData(options);        
        data.enrichedBehaviour = await TextEditor.enrichHTML(getProperty(this.actor.system, "notes.fight"), {secrets: true, async: true})
        data.enrichedSpecialrules = await TextEditor.enrichHTML(getProperty(this.actor.system, "notes.specialRules"), {secrets: true, async: true})
        return data;
    }

    async _cleverDeleteItem(itemId) {
        let item = this.actor.items.find(x => x.id == itemId)
        switch (item.type) {
            case "trait":
                await this._updateAPs(item.system.ap * -1)
                break;
        }
        await super._cleverDeleteItem(itemId)
    }

    async _addTrait(item) {
        let res = this.actor.items.find(i => i.type == "trait" && i.name == item.name);
        if (!res) {
            await this._updateAPs(item.system.ap)
            //await TraitRulesDSA5.traitAdded(this.actor, item)
            await this.actor.createEmbeddedDocuments("Item", [item]);
        }
    }

    async _onDropItemCreate(itemData) {
        if(itemData.type == "trait") return this._addTrait(itemData)

        return super._onDropItemCreate(itemData)
    }
}