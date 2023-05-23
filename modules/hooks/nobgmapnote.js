export class TransparentControlIcon extends ControlIcon {
    async draw() {
        this.bg.clear()
        return await super.draw()
    }
}

export const initHook = () => {    
    Note.prototype._drawControlIcon = function () {
        const noBG = this.document.getFlag("dsk", "noBG");
        let tint = Color.from(this.document.texture.tint || null);
        const data = {texture: this.document.texture.src, size: this.size, tint}
        let icon = noBG ? new TransparentControlIcon(data) : new ControlIcon(data);
        icon.x -= (this.size / 2);
        icon.y -= (this.size / 2);
        return icon;
    };
}

/* set map notes transparent:
for(let note of game.canvas.scene.notes) {
    await note.setFlag("dsk", "noBG", true)
}
*/