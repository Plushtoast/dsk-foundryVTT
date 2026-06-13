import ActorDSK from "../actor/actor_dsk.js";
const { getProperty, setProperty, getType } = foundry.utils

export default class DSKActiveEffect extends ActiveEffect {
    static itemChangeRegex = /^@/

    static applyChange(targetDoc, change, options = {}) {
        if (DSKActiveEffect.itemChangeRegex.test(change.key)) {
            const effect = change.effect;
            const modifiedItems = effect._getModifiedItems(targetDoc, change);

            for (const item of modifiedItems.items) {
                if (!item.overrides) item.overrides = {};
                const overrides = foundry.utils.flattenObject(item.overrides);
                const newChange = { ...change, key: modifiedItems.key, value: modifiedItems.value };
                const result = super.applyChange(item, newChange, options);
                Object.assign(overrides, result);
                item.overrides = foundry.utils.expandObject(overrides);
            }
            return {};
        }
        return super.applyChange(targetDoc, change, options);
    }

    static _applyChangeCustom(targetDoc, change, current, delta, changes) {
        const update = DSKActiveEffect._applyCustomEffect(targetDoc, change, current);
        if (update !== null) {
            changes[change.key] = update;
            return;
        }
        return super._applyChangeCustom(targetDoc, change, current, delta, changes);
    }

    static _applyCustomEffect(targetDoc, change, current) {
        if (current == null && /^system\.(vulnerabilities|resistances)/.test(change.key)) {
            current = [];
            setProperty(targetDoc, change.key, current);
        }
        const ct = getType(current);
        let update = null;
        switch (ct) {
            case "Array":
                const newElems = [];
                const source = change.effect.name;
                for (const elem of `${change.value}`.split(/[;,]+/)) {
                    const vals = elem.split(" ");
                    const value = vals.pop();
                    const target = vals.join(" ");
                    newElems.push({ source, value, target });
                }
                update = current.concat(newElems);
        }
        return update;
    }

    _getModifiedItems(actor, change) {
        const data = change.key.split(".")
        let type = data.shift()
        type = type.replace("@", "").toLowerCase()
        const itemName = data.shift()
        const key = data.join(".")
        const value = change.value
        const items = actor?.items?.filter(x => x.type == type && (x.name == itemName || x.id == itemName)) || []
        return { items, key, value }
    }

    static async _onCreateOperation(documents, operation, user) {
        for(let doc of documents) {
            if(doc.parent.documentName == "Actor")
                await ActorDSK.postUpdateConditions(doc.parent)
        }
        return super._onCreateOperation(documents, operation, user);
      }

    static async _onUpdateOperation(documents, operation, user) {
        for(let doc of documents) {
            if(doc.parent.documentName == "Actor")
                await ActorDSK.postUpdateConditions(doc.parent)
        }
        return super._onUpdateOperation(documents, operation, user);
    }

    static async _onDeleteOperation(documents, operation, user) {
        for(let doc of documents) {
            if(doc.parent.documentName == "Actor")
                await ActorDSK.postUpdateConditions(doc.parent)
        }
        return super._onDeleteOperation(documents, operation, user);
    }
    

    async _preUpdate(changed, options, user) {
        await super._preUpdate(changed, options, user);
        this._clearModifiedItems()
    }

    _clearModifiedItems() {
        if (!(this.parent instanceof CONFIG.Actor.documentClass)) return

        for (let change of this.system?.changes ?? this.changes) {
            if (DSKActiveEffect.itemChangeRegex.test(change.key)) {
                const itemsToClear = this._getModifiedItems(this.parent, change)

                for (const item of itemsToClear.items) {
                    const overrides = foundry.utils.flattenObject(item.overrides || {});
                    
                    const key = itemsToClear.key;
                    delete overrides[key];
                    const source = getProperty(item._source, key);
                    setProperty(item, key, source);

                    item.overrides = foundry.utils.expandObject(overrides);
                    if (item.sheet?.rendered) item.sheet.render(true);
                }
            }
        }
    }

    async _preDelete(options, user) {
        super._preDelete(options, user);
        this._clearModifiedItems()
    }
}