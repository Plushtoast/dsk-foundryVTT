export class TransparentControlIcon extends foundry.canvas.containers.ControlIcon {
    /** @override */
    _refresh() {
        super._refresh();
        // v14 draws the white background and border in _refresh(), not draw()
        this.bg.clear();
        this.border.clear();
    }
}

export const initHook = () => {
    foundry.canvas.placeables.Note.prototype._drawControlIcon = function () {
        const noBG = this.document.getFlag("dsk", "noBG");
        const data = { texture: this.document.texture.src };
        return noBG
            ? new TransparentControlIcon(data)
            : new foundry.canvas.containers.ControlIcon(data);
    };
}

/* set map notes transparent:
for(let note of game.canvas.scene.notes) {
    await note.setFlag("dsk", "noBG", true)
}
*/