import DSKUtility from "../system/dsk_utility.js"
import RuleChaos from "../system/rule_chaos.js"
import DSK from "../system/config.js"

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
            items: [...items, newItem],
            flags: { core: { sheetClass: "dsk.MerchantSheetDSK" } },
            folder,
            system: {
                merchant: {
                    merchantType: "loot",
                    temporary: true,
                    hidePlayer: 1
                },
                status: { wounds: { value: 16 } }
            }
        };
        const finalActor = await game.dsk.documents.ActorDSK.create(actor)
        const td = await finalActor.getTokenDocument({ x: data.x, y: data.y, hidden: false });
        if (!canvas.dimensions.rect.contains(td.x, td.y)) return false

        const cls = getDocumentClass("Token");
        await cls.create(td, { parent: canvas.scene });

        if (sourceActor) {
            const newCount = item.system.quantity - amount
            if (newCount < 1) {
                await sourceActor.deleteEmbeddedDocuments("Item", [item.id])
            } else {
                await sourceActor.updateEmbeddedDocuments("Item", [{
                    _id: item.id,
                    "system.quantity": newCount
                }])
            }
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

    if (!DSK.equipmentCategories.includes(item.type)) return

    const content = await renderTemplate("systems/dsk/templates/dialog/dropToGround.html", { name: item.name, count: item.system.quantity })

    new DropToGroundDialog({
        title: data.name,
        content,
        default: 'yes',
        buttons: {
            Yes: {
                icon: '<i class="fa fa-check"></i>',
                label: game.i18n.localize("dsk.yes"),
                callback: async(dlg) => dropToGround(sourceActor, item, data, Number(dlg.find('[name="count"]').val()))
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: game.i18n.localize("dsk.cancel")
            }
        }
    }).render(true)
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

class DropToGroundDialog extends Dialog {
    activateListeners(html) {
        super.activateListeners(html)
        html.find('input[type="range"]').change(ev => {
            $(ev.currentTarget).closest('.row-section').find('.range-value').html($(ev.currentTarget).val())
        })
    }
}