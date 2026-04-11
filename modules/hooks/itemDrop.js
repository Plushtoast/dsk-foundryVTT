import DSKUtility from "../system/dsk_utility.js"
import RuleChaos from "../system/rule_chaos.js"
import DSK from "../system/config.js"
const { getProperty } = foundry.utils
const { renderTemplate } = foundry.applications.handlebars;

export function fetchBagItems(item, sourceActor) {
    const bagItems = []
    for (const i of sourceActor.items) {
        if (i.system.parent_id == item.id) {
            bagItems.push(i)
            if (i.type == "equipment" && getProperty(i, "system.category") == "bags") {
                const nestedBagItems = fetchBagItems(i, sourceActor)
                bagItems.push(...nestedBagItems)
            }
        }
    }
    return bagItems
}

function collectBagContentsGrouped(bagItemData, sourceActor) {
    const childrenByDepth = new Map()

    function collect(parentId, depth) {
        for (const i of sourceActor.items) {
            if (i.system.parent_id == parentId) {
                const obj = i.toObject()
                if (!childrenByDepth.has(depth)) childrenByDepth.set(depth, [])
                childrenByDepth.get(depth).push(obj)
                if (i.type == "equipment" && getProperty(i, "system.category") == "bags") {
                    collect(i.id, depth + 1)
                }
            }
        }
    }

    collect(bagItemData._id || bagItemData.id, 1)
    return childrenByDepth
}

export async function transferBagWithContents(sourceActor, targetActor, bagItemData) {
    const { duplicate } = foundry.utils
    const childrenByDepth = collectBagContentsGrouped(bagItemData, sourceActor)
    const allChildren = [...childrenByDepth.values()].flat()
    const idMap = new Map()

    const bagCopy = duplicate(bagItemData)
    bagCopy.system.parent_id = bagCopy.system.parent_id || ""
    if (bagCopy.system.worn?.value) bagCopy.system.worn.value = false
    delete bagCopy._id

    const [createdBag] = await targetActor.createEmbeddedDocuments("Item", [bagCopy], { render: false })
    idMap.set(bagItemData._id || bagItemData.id, createdBag.id)

    const depths = [...childrenByDepth.keys()].sort((a, b) => a - b)
    for (const depth of depths) {
        const items = childrenByDepth.get(depth)
        const copies = items.map((item) => {
            const copy = duplicate(item)
            const newParentId = idMap.get(copy.system.parent_id)
            if (newParentId) copy.system.parent_id = newParentId
            if (copy.system.worn?.value) copy.system.worn.value = false
            delete copy._id
            return copy
        })
        const created = await targetActor.createEmbeddedDocuments("Item", copies, { render: false })
        for (let idx = 0; idx < items.length; idx++) {
            idMap.set(items[idx]._id, created[idx].id)
        }
    }

    const deleteIds = [bagItemData._id || bagItemData.id, ...allChildren.map((c) => c._id)].filter(Boolean)
    const existingIds = deleteIds.filter((id) => sourceActor.items.has(id))
    if (existingIds.length > 0) {
        await sourceActor.deleteEmbeddedDocuments("Item", existingIds, { render: false })
    }

    if (sourceActor.sheet?.rendered) sourceActor.sheet.render(true)
    if (targetActor.sheet?.rendered) targetActor.sheet.render(true)

    return createdBag
}

export const dropToGround = async(sourceActor, item, data, amount) => {
    if (game.user.isGM) {
        let folder = await DSKUtility.getFolderForType("Actor", null, "Dropped Items")
        const userIds = game.users.filter(x => !x.isGM).map(x => x.id)

        const ownership = userIds.reduce((prev, cur) => {
            prev[cur] = 1
            return prev
        }, { default: 0 })

        const newItem = item.toObject()
        newItem.system.quantity = amount
        RuleChaos.obfuscateDropData(newItem, data.tabsinvisible)

        if (getProperty(newItem, "system.worn.value")) newItem.system.worn.value = false
        const isBag = sourceActor && item.type == "equipment" && getProperty(item, "system.category") == "bags"
        let bagItems = []
        if (isBag) {
            bagItems = fetchBagItems(item, sourceActor).map((i) => i.toObject())
        }

        const actor = {
            type: "npc",
            name: item.name,
            img: item.img,
            prototypeToken: {
                img: item.img,
                width: 0.4,
                height: 0.4
            },
            ownership,
            items: [newItem, ...bagItems],
            flags: { core: { sheetClass: "dsk.MerchantSheetDSK" } },
            folder,
            system: {
                merchant: {
                    merchantType: "loot",
                    temporary: true,
                    hidePlayer: 1
                },
                stats: { LeP: { value: 16 } }
            }
        };
        const finalActor = await game.dsk.documents.ActorDSK.create(actor)
        const td = await finalActor.getTokenDocument({ x: data.x, y: data.y, hidden: false });
        if (!canvas.dimensions.rect.contains(td.x, td.y)) return false

        if (sourceActor) {
            await canvas.scene.createEmbeddedDocuments("Token", [td], { noHook: true })
            const newCount = item.system.quantity - amount
            if (newCount < 1) {
                await sourceActor.deleteEmbeddedDocuments("Item", [item.id])
            } else {
                await sourceActor.updateEmbeddedDocuments("Item", [{ _id: item.id, "system.quantity": newCount }])
            }
            if (bagItems.length > 0) {
                await sourceActor.deleteEmbeddedDocuments("Item", bagItems.map((i) => i._id))
            }
        }else{
            await canvas.scene.createEmbeddedDocuments("Token", [td])
        }
    } else {
        const payload = {
            itemId: item.uuid,
            sourceActorId: sourceActor?.id,
            data,
            amount
        };
        game.socket.emit("system.dsk", {
            type: "itemDrop",
            payload
        });
    }
}

const handleItemDrop = async(canvas, data) => {
    const item = await Item.implementation.fromDropData(data);
    const sourceActor = item.parent

    if (!DSK.equipmentCategories.has(item.type)) return

    const content = await renderTemplate("systems/dsk/templates/dialog/dropToGround.hbs", { name: item.name, count: item.system.quantity })

    const dialog = new DropToGroundDialog({
        window: { title: item.name },
        content,
        buttons: [
            {
                action: "yes",
                icon: "fa fa-check",
                label: "dsk.yes",
                default: true,
                callback: async (event, button, dlg) => {
                    const html = $(button.form);
                    dropToGround(sourceActor, item, data, Number(html.find('[name="count"]').val()))
                }
            },
            {
                action: "cancel",
                icon: "fas fa-times",
                label: "dsk.cancel"
            }
        ]
    });
    dialog.render(true);
}

const handleGroupDrop = async(canvas, data) => {
    let x = data.x
    let y = data.y
    let count = 0
    const gridSize = canvas.grid.size
    const rowLength = Math.ceil(Math.sqrt(data.ids.length))
    for(let id of data.ids){
        const actor = game.actors.get(id)
        if(!actor) continue
        
        const td = await actor.getTokenDocument({x, y, hidden: false});
        td.constructor.create(td, {parent: canvas.scene});
        if(rowLength % count == 0 && count > 0){
            y += gridSize
            x = data.x
        }else{
            x += gridSize
        }
        count++
    }
}

export const connectHook = () => {
    Hooks.on("dropCanvasData", async(canvas, data) => {
        if (!(game.settings.get("dsk", "enableItemDropToCanvas") || game.user.isGM || data.tokenId)) return

        if (data.type == "Item") {
            handleItemDrop(canvas, data)
            return false
        } else if(data.type == "GroupDrop") {
            handleGroupDrop(canvas, data)
            return false
        }
    })
}

class DropToGroundDialog extends foundry.applications.api.DialogV2 {
    async _onRender(context, options) {
        await super._onRender(context, options);

        const html = $(this.element);
        html.find('input[type="range"]').on('change', ev => {
            $(ev.currentTarget).closest('.row-section').find('.range-value').html($(ev.currentTarget).val())
        });
    }
}