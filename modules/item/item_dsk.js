import DSKUtility from "../system/dsk_utility.js"

export default class ItemDSK extends Item{
    static defaultImages(type, subtype = undefined){
        const key = `${subtype}${subtype}`
        return {

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
            information: ItemInformation,
            trait: ItemTrait
        }
    }

    async postItem() {
        ItemDSK.getSubClass(this.type)._postItem(this)
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

class ItemTrait extends ItemDSK {

}

class ItemInformation extends ItemDSK {

}

class ItemEffectwrapper extends ItemDSK {

}

class ItemMeleeweapon extends ItemDSK{

}

class ItemRangeweapon extends ItemDSK{

}

class ItemArmor extends ItemDSK{

}

class ItemAmmunition extends ItemDSK{

}

class ItemEquipment extends ItemDSK{

}

class ItemSpecies extends ItemDSK{

}

class ItemCulture extends ItemDSK{

}

class ItemProfession extends ItemDSK{

}

class ItemAdvantage extends ItemDSK{

}

class ItemDisadvantage extends ItemDSK{

}

class ItemSpecialability extends ItemDSK{

}

class ItemAhnengeschenk extends ItemDSK{

}

class ItemAhnengabe extends ItemDSK{

}

class ItemPoison extends ItemDSK{

}

class ItemSkill extends ItemDSK{

}

class ItemCombatskill extends ItemDSK{

}