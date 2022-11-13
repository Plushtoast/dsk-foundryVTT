export function setupMacros() {
    Hooks.on("hotbarDrop", (bar, data, slot) => {
        if (data.type == "Item") {
            const item = fromUuidSync(data.uuid)
            const possibleItems = ["ahnengabe", "meleeweapon", "rangeweapon", "skill", "combatskill", "char", "trait"]
            if (!possibleItems.includes(item.type))
                return

            if ((item.type == "meleeweapon" || item.type == "combatskill") && !['attack', 'parry'].includes(data.mod)) {
                return
            } else if ((item.type == "rangeweapon" || item.type == "trait") && !['attack'].includes(data.mod)) {
                return
            }
            let param = `{mod: "${data.mod}"}`
            let command
            if (game.user.isGM || data.actorId == undefined) {
                command = `game.dsk.macro.itemMacro("${item.name}", "${item.type}", ${param});`;
            } else {
                command = `game.dsk.macro.itemMacroById("${data.actorId}", "${item.name}", "${item.type}", ${param})`;
            }
            let name = data.mod == undefined ? item.name : `${item.name} - ${game.i18n.localize("dsk.characteristics." + data.mod + ".name")}`
            return createHotBarMacro(command, name, item.img, slot)
        } else if (data.type == "Actor" || data.type == "JournalEntry") {
            const elem = fromUuidSync(data.uuid)
            let command = `(await fromUuid('${data.uuid}')).sheet.render(true)`

            return createHotBarMacro(command, elem.name, elem.img, slot)
        }
    });
}

function createHotBarMacro(command, name, img, slot) {
    let macro = game.macros.contents.find(m => (m.name === name) && (m.command === command));
    if (!macro) {
        Macro.create({
            name,
            type: "script",
            img,
            command
        }, { displaySheet: false }).then(macro => game.user.assignHotbarMacro(macro, slot))
    }else{
        game.user.assignHotbarMacro(macro, slot);
    }
    return false
}
    