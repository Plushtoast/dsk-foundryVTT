export function svgAutoFit(elem, width = 320, height = 40) {
  elem.attr({
    width,
    viewBox: `0 0 ${width} ${height}`,
  });
  const text = elem.find('text')[0];
  let bbox = text.getBBox();
  let textWidth = bbox.width;
  let textHeight = bbox.height;
  let scaleX = width / textWidth;
  let scaleY = height / textHeight;
  let scale = Math.min(scaleX, scaleY);
  
  let centerX = width / 2 - (textWidth * scale) / 2 - bbox.x * scale;
  let centerY = height / 2 - (textHeight * scale) / 2 - bbox.y * scale;
  if (isFinite(scale)) {
    text.setAttribute("transform", `matrix(${scale}, 0, 0, ${scale}, ${centerX}, ${centerY})`);
  }
}

export function slist(html, target, callback, itemTag = "div") {
    target = html.find(target)[0];
    if (!target) return

    target.classList.add("slist");

    let items = target.querySelectorAll(itemTag),
        current = null;
    for (let i of items) {
        i.draggable = true;

        i.addEventListener("dragstart", function(ev) {
            current = this;
        });

        i.addEventListener("dragover", function(evt) {
            evt.preventDefault();
        });

        i.addEventListener("drop", async function(evt) {
            evt.preventDefault();
            if (this != current) {
                let currentpos = 0,
                    droppedpos = 0;
                for (let it = 0; it < items.length; it++) {
                    if (current == items[it]) { currentpos = it; }
                    if (this == items[it]) { droppedpos = it; }
                }
                if (currentpos < droppedpos) {
                    this.parentNode.insertBefore(current, this.nextSibling);
                } else {
                    this.parentNode.insertBefore(current, this);
                }
                await callback(target)
            }
        });
    }
}

export function tinyNotification(message) {
    let container = $('.tinyNotifications')
    if (!container.length) {
        $('body').append('<ul class="tinyNotifications"></ul>')
        container = $('.tinyNotifications')
    }
    const elem = $(`<li>${message}</li>`)
    container.prepend(elem)
    setTimeout(function() { elem.remove() }, 1500)
}

export async function itemFromDrop(dragData, actorId, toObject = true) {
    let item
    let selfTarget
    if(dragData.type == "Actor"){
        item = await Actor.implementation.fromDropData(dragData)
        selfTarget = actorId === item.id
    }else{
        item = await Item.implementation.fromDropData(dragData)
        selfTarget = actorId === item.parent?.uuid
    }
    let typeClass = item?.type
    
    if (toObject) {
        item = item.toObject()
    }

    if(dragData.amount) item.system.quantity.value = Number(dragData.amount)
    
    return { item, typeClass, selfTarget }
}