export class TransparentControlIcon extends foundry.canvas.containers.ControlIcon {
    async draw() {
        this.bg.clear()
        return await super.draw()
    }
}

export const initHook = () => {    
    foundry.canvas.placeables.Note.prototype._drawControlIcon = function () {
        const noBG = this.document.getFlag("dsk", "noBG");
        let tint = Color.from(this.document.texture.tint || null);
        const data = {texture: this.document.texture.src, size: this.document.iconSize, tint}
        let icon = noBG ? new TransparentControlIcon(data) : new foundry.canvas.containers.ControlIcon(data);
        icon.x -= (this.document.iconSize / 2);
        icon.y -= (this.document.iconSize / 2);
        return icon;
    };
}

/* set map notes transparent:
for(let note of game.canvas.scene.notes) {
    await note.setFlag("dsk", "noBG", true)
}
*/