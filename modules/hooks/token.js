import DPS from "../system/derepositioningsystem.js";
const { getProperty } = foundry.utils
const { Token } = foundry.canvas.placeables;


export class DSKToken extends Token {
    async _drawEffects() {
        this.effects.renderable = false;
        this.effects.removeChildren().forEach((c) => c.destroy());
        this.effects.bg = this.effects.addChild(new PIXI.Graphics());
        this.effects.overlay = null;

        let activeEffects = [];
        let hasOverlay = false;

        if (this.actor) {
            activeEffects = await this.actor.actorEffects();
        }

        const promises = [];
        for (const effect of activeEffects) {
            if (!effect.img) continue;
            if (effect.getFlag('core', 'overlay') && !hasOverlay) {
                promises.push(this._drawOverlay(effect.img, effect.tint));
                hasOverlay = true;
            } else promises.push(this._drawEffect(effect.img, effect.tint, getProperty(effect, 'flags.dsk.value')));
        }
        await Promise.allSettled(promises);

        this.effects.renderable = true;
        this.renderFlags.set({ refreshEffects: true });
    }

    _refreshEffects() {
        let i = 0;
        const w = Math.round(canvas.dimensions.size / 10) * 2;
        const rows = Math.floor(this.document.height * 5);
        const bg = this.effects.bg.clear().beginFill(0x000000, 0.4).lineStyle(1.0, 0x000000);
        for (const effect of this.effects.children) {
            if (effect === bg) continue;
            if (effect.isCounter) continue;

            // Overlay effect
            if (effect === this.effects.overlay) {
                const { width, height } = this.document.getSize();
                const size = Math.min(width * 0.6, height * 0.6);
                effect.width = effect.height = size;
                effect.position = this.getCenterPoint({ x: 0, y: 0 });
                effect.anchor.set(0.5, 0.5);
            }

            // Status effect
            else {
                effect.width = effect.height = w;
                effect.x = Math.floor(i / rows) * w;
                effect.y = (i % rows) * w;
                bg.drawRoundedRect(effect.x + 1, effect.y + 1, w - 2, w - 2, 2);

                if (effect.counter > 1 && !effect.counterDrawn) {
                    let textEffect = game.dsk.config.effectTextStyle;
                    let color = game.settings.get('dsk', 'statusEffectCounterColor');
                    textEffect._fill = /^#[0-9A-F]+$/.test(color) ? color : '#000000';
                    let text = this.effects.addChild(new foundry.canvas.containers.PreciseText(effect.counter, textEffect));
                    text.x = effect.x;
                    text.y = effect.y;
                    text.isCounter = true;
                    effect.counterDrawn = true;
                }
                i++;
            }
        }
    }

    async _drawEffect(src, tint, value) {
        if (!src) return;
        const tex = await foundry.canvas.loadTexture(src, { fallback: 'icons/svg/hazard.svg' });
        const icon = new PIXI.Sprite(tex);
        icon.tint = tint ?? 0xffffff;
        icon.counter = value;
        return this.effects.addChild(icon);
    };

    _onClickLeft2(event) {
        const distanceAccessible = game.user.isGM || !game.settings.get("dsk", "enableDPS") || !this.isMerchant(this.actor) || DPS.inDistance(this)

        if (!distanceAccessible)
            return ui.notifications.warn('dsk.DSKError.notInRangeToLoot', {
                localize: true,
            });

        super._onClickLeft2(event);
    };

    isMerchant(actor) {
        if (!actor) return false

        return ["merchant", "loot"].includes(getProperty(actor.system, "merchant.merchantType"))
    }
}

export class DSKTokenDocument extends TokenDocument {
    _inferMovementAction() {
        if (this.hasStatusEffect("prone")) return "crawl";
        return super._inferMovementAction();
    }
}

export class DSKTokenRuler extends foundry.canvas.placeables.tokens.TokenRuler {
    static COLOR_WALKING = 0x008000;        // Green
    static COLOR_RUNNING = 0xFFD700;        // Yellow/Gold
    static COLOR_CRAWLING = 0x808000;       // Olive
    static COLOR_CRAWLING_FAST = 0xFF8C00;  // Dark Orange
    static COLOR_IMPOSSIBLE = 0xFF0000;     // Red

    _getWaypointStyle(waypoint) {
        if (!game.settings.get('dsk', 'dskTokenRuler')) return super._getWaypointStyle(waypoint);

        const color = this._totalDistanceColor(waypoint);
        return { width: 8, color, alpha: 1 };
    }

    _colorByAction(action) {
        switch (action) {
            case "crawl":
                return { normal: DSKTokenRuler.COLOR_CRAWLING, fast: DSKTokenRuler.COLOR_CRAWLING_FAST };
            default:
                return { normal: DSKTokenRuler.COLOR_WALKING, fast: DSKTokenRuler.COLOR_RUNNING };
        }
    }

    _totalDistanceColor(waypoint) {
        const token = this.token.document;
        const actor = token.actor;
        if (!actor) return DSKTokenRuler.COLOR_WALKING;

        let colors = this._colorByAction(waypoint.action);
        const speed = actor.system?.stats?.gs?.max ?? 0;

        if (waypoint.measurement.cost > speed * 2) {
            return DSKTokenRuler.COLOR_IMPOSSIBLE;
        }
        return waypoint.measurement.cost <= speed ? colors.normal : colors.fast;
    }

    _getSegmentStyle(waypoint) {
        if (!game.settings.get('dsk', 'dskTokenRuler')) return super._getSegmentStyle(waypoint);

        const color = this._totalDistanceColor(waypoint);
        return { width: 8, color, alpha: 1 };
    }
}