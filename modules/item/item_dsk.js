import DSKUtility from "../system/dsk_utility.js"

export default class ItemDSK extends Item{
    static defaultImages(type, subtype = undefined){
        const key = `${subtype}${subtype}`
        return {

        }[key]
    }

    static defaultIcon(data) {
        if (!data.img || data.img == "") {
            data.img = this.defaultImages(data.type) || "systems/dsa5/icons/blank.webp"
        }
    }

    static async create(data, options) {
        this.defaultIcon(data)
        return await super.create(data, options)
    }

    static setupSubClasses() {
        game.dsk.config.ItemSubClasses = {

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

        const html = await renderTemplate("systems/dsa5/templates/chat/post-item.html", chatData)
        const chatOptions = DSKUtility.chatDataSetup(html)
        ChatMessage.create(chatOptions)
    }
}