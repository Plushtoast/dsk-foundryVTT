import DSKUtility from "../system/dsk_utility.js"

export default class ItemDSK extends Item{
    static defaultImages(type, subtype = ""){
        const key = `${type}${subtype}`
        return {
            effectwrapper: "icons/svg/aura.svg",
            information: "systems/dsk/icons/categories/DSK-Auge.webp",
            ammunition: "systems/dsk/icons/categories/arrow.webp",
            equipment: "systems/dsk/icons/categories/equipment.webp",
            advantage: "systems/dsk/icons/categories/advantage.webp",
            disadvantage: "systems/dsk/icons/categories/disadvantage.webp",
            specialability: "systems/dsk/icons/categories/specialability.webp",
            combatskill: "systems/dsk/icons/categories/combatskill.webp"
        }[key]
    }

    static defaultIcon(data) {
        if (!data.img || data.img == "") {
            data.img = this.defaultImages(data.type) || "systems/dsk/icons/blank.webp"
        }
    }

    static async create(data, options) {
        this.defaultIcon(data)
        return await super.create(data, options)
    }

    static getSubClass(type) {
        return game.dsk.config.ItemSubClasses[type] || ItemDSK
    }

    static _chatLineHelper(key, val) {
        return `<b>${game.i18n.localize(key)}</b>: ${val ? val : "-"}`
    }

    static setupSubClasses() {
        game.dsk.config.ItemSubClasses = {
            meleeweapon: ItemMeleeweapon,
            rangeweapon: ItemRangeweapon,
            armor: ItemArmor,
            ammunition: ItemAmmunition,
            equipment: ItemEquipment,
            species: ItemSpecies,
            culture: ItemCulture,
            profession: ItemProfession,
            advantage: ItemAdvantage,
            disadvantage: ItemDisadvantage,
            specialability: ItemSpecialability,
            ahnengeschenk: ItemAhnengeschenk,
            ahnengabe: ItemAhnengabe,
            poison: ItemPoison,
            skill: ItemSkill,
            combatskill: ItemCombatskill,
            effectwrapper: ItemEffectwrapper,
            information: ItemInformation
        }
    }

    async postItem() {
        ItemDSK.getSubClass(this.type)._postItem(this)
    }

    static chatData(data, name) {
        return []
    }

    static async _postItem(item) {
        let chatData = duplicate(item)
        const properties = ItemDSK.getSubClass(item.type).chatData(duplicate(chatData.system), item.name)

        chatData["properties"] = properties

        chatData.hasPrice = "price" in chatData.system
        if (chatData.hasPrice) {
            properties.push(`<b>${game.i18n.localize("dsk.price")}</b>: ${chatData.system.price}`)
        }

        if (item.pack) chatData.itemLink = item.link

        if (chatData.img.includes("/blank.webp")) chatData.img = null

        const html = await renderTemplate("systems/dsk/templates/chat/post-item.html", chatData)
        const chatOptions = DSKUtility.chatDataSetup(html)
        ChatMessage.create(chatOptions)
    }
}

class ItemInformation extends ItemDSK {
    static async _postItem(item){
        const html = await renderTemplate("systems/dsk/templates/chat/informationRequestRoll.html", {item})
        const chatOptions = DSKUtility.chatDataSetup(html)
        ChatMessage.create(chatOptions)
    }
}

class ItemEffectwrapper extends ItemDSK {

}

class ItemMeleeweapon extends ItemDSK{
    static chatData(data, name) {
        let res = [
            this._chatLineHelper("dsk.damage", data.tp),
            this._chatLineHelper("dsk.ABBR.awvw", `${data.aw} / ${data.vw}`),
            this._chatLineHelper("ITEM.TypeCombatskill", data.combatskill),
            this._chatLineHelper("dsk.range", game.i18n.localize(`dsk.Range.${data.rw}`)),
        ]

        return res
    }
}

class ItemRangeweapon extends ItemDSK{
    static chatData(data, name) {
        let res = [
            this._chatLineHelper("dsk.damage", data.tp),
            this._chatLineHelper("ITEM.TypeCombatskill", data.combatskill),
            this._chatLineHelper("dsk.range", data.rw),
        ]

        return res
    }
}

class ItemArmor extends ItemDSK{
    static chatData(data, name) {
        let properties = [
            this._chatLineHelper("dsk.protection", data.rs)
        ]

        return properties
    }
}

class ItemAmmunition extends ItemDSK{
    static chatData(data, name) {
        return [this._chatLineHelper("dsk.ammunitionType", game.i18n.localize(`dsk.ammunition.${data.ammunitionType}`))]
    }
}

class ItemEquipment extends ItemDSK{
    static chatData(data, name) {
        return [this._chatLineHelper("dsk.equipmentType", game.i18n.localize(`dsk.Equipment.${data.equipmentType.value}`))]
    }
}

class ItemSpecies extends ItemDSK{

}

class ItemCulture extends ItemDSK{

}

class ItemProfession extends ItemDSK{

}

class ItemAdvantage extends ItemDSK{
    static chatData(data, name) {
        return [this._chatLineHelper("dsk.rule", data.rule)]
    }
}

class ItemDisadvantage extends ItemAdvantage{

}

class ItemSpecialability extends ItemDSK{
    static chatData(data, name) {
        return [this._chatLineHelper("dsk.rule", data.rule)]
    }
}

class ItemAhnengeschenk extends ItemDSK{

}

class ItemAhnengabe extends ItemDSK{
    static chatData(data, name) {
        return [
            this._chatLineHelper("dsk.AeP", data.AeP),
            this._chatLineHelper("dsk.distribution", data.distribution),
            this._chatLineHelper("dsk.duration", data.duration),
            this._chatLineHelper("dsk.range", data.range),
            this._chatLineHelper("dsk.targetCategory", data.targetCategory)
        ]
    }
}

class ItemPoison extends ItemDSK{
    static chatData(data, name) {
        return [
            this._chatLineHelper("dsk.stepValue", data.level),
            this._chatLineHelper("dsk.poisonType", data.category),
            this._chatLineHelper("dsk.start", data.start),
            this._chatLineHelper("dsk.duration", data.duration),
            this._chatLineHelper("dsk.resistanceModifier", data.resist),
            this._chatLineHelper("dsk.effect", DSKUtility.replaceConditions(DSKUtility.replaceDies(data.effect.value))),
        ]
    }

}

class ItemSkill extends ItemDSK{

}

class ItemCombatskill extends ItemDSK{

}