export function setupMacros() {
    Hooks.on("hotbarDrop", (bar, data, slot) => {
        
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
    