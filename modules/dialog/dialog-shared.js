import RuleChaos from "../system/rule_chaos.js"
import { AddTargetDialog } from "./addTargetDialog.js"
const { renderTemplate } = foundry.applications.handlebars;

export default class DialogShared extends foundry.applications.api.DialogV2 {
    static roman = ['', ' I', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X'];

    recallSettings(speaker, source, mode, renderData) {
        this.recallData = game.dsk.memory.recall(speaker, source, mode);
        this.dialogData = {
            mode,
            speaker,
            source,
            renderData,
        };
        return this;
    }

    setRollButtonWarning() {
        if (this.dialogData.mode === "attack") {
            const noTarget = game.i18n.localize("dsk.DIALOG.noTarget");
            return `<span class="missingTarget"><i class="fas fa-exclamation-circle"></i> ${noTarget}</span>`;
        }
        return "";
    }

    setMultipleTargetsWarning() {
        if (this.dialogData.mode === "attack") {
            const noTarget = game.i18n.localize("dsk.DIALOG.multipleTarget");
            return `<span class="multipleTarget"><i class="fas fa-exclamation-circle"></i> ${noTarget}</span>`;
        }
        return "";
    }

    renderRollValueDie() {
        if (!this.dialogData.rollValue || this.dialogData.mode === "damage") return "";

        const dieClass = this.dialogData.mode === "attack" ? "die-mu" : "die-in";
        const modifier = this.dialogData.modifier || 0;
        return `<span class="rollValue ${dieClass} d20">${this.dialogData.rollValue + modifier}</span>`;
    }

    async updateRollButton(targets) {
        let rollTag = this.renderRollValueDie() + game.i18n.localize('dsk.Roll');

        if (targets.length === 0) {
            rollTag += this.setRollButtonWarning();
        } else if (targets.length > 1) {
            rollTag += this.setMultipleTargetsWarning();
        }

        $(this.element).find('.form-footer [data-action="rollButton"]').html(rollTag);
    }

    async updateTargets(html, targets) {
        const template = await renderTemplate('systems/dsk/templates/dialog/parts/targets.hbs', { targets });
        html.find(".targets").html(template);
        this.updateRollButton(targets);
    }

    removeTarget(ev) {
        const id = ev.currentTarget.dataset.id;
        $(ev.currentTarget).remove();
        
        const newIds = Array.from(game.user.targets)
            .filter(target => id !== target.id)
            .map(target => target.id);

        if (game.canvas.ready) {
            game.user._onUpdateTokenTargets(newIds);
        }
    }

    readTargets() {
        return Array.from(game.user.targets)
            .filter(target => target.actor)
            .map(target => ({
                name: target.actor.name,
                img: target.actor.img,
                id: target.id
            }));
    }

    compareTargets(html, targets) {
        const newTargets = this.readTargets();
        if (JSON.stringify(targets) !== JSON.stringify(newTargets)) {
            this.updateTargets(html, newTargets);
            return newTargets;
        }
        return targets;
    }

    async _onRender(context, options) {
        await super._onRender(context, options);
        this.prepareFormRecall($(this.element));

        const html = $(this.element);

        html.find('.quantity-click').on('mousedown', ev => {
            const quantityFocus = ev.currentTarget.dataset.quantityfocus;
            const target = $(ev.currentTarget);
            if (quantityFocus && !target.is(":focus")) {
                setTimeout(function() { target.select(); }, 100);
                return;
            }
            const val = { val: Number(target.val()) };
            RuleChaos.increment(ev, val, "val");
            target.val(val.val);
        });

        html.find(".modifiers option").on('mousedown', (ev) => {
            ev.preventDefault();
            $(ev.currentTarget).prop("selected", !$(ev.currentTarget).prop("selected"));
            return false;
        });

        html.on('click', '.rollTarget', (ev) => this.removeTarget(ev));
        html.on('click', '.addTarget', (ev) => this.addTarget(ev));
    }

    async addTarget(ev) {
        (await AddTargetDialog.getDialog(this.dialogData.speaker)).render(true);
    }

    prepareFormRecall(html) {
        if (this.recallData) {
            for (const key in this.recallData) {
                if (key == "specAbs") {
                    for (const spec of this.recallData[key]) {
                        const elem = html.find(`.specAbs[data-id="${spec.id}"]`)
                        elem.addClass('active')
                            .attr("data-step", spec.step)

                        elem.find('.step').text(DialogShared.roman[spec.step])
                    }
                } else {
                    const elem = html.find(`[name="${key}"]`)
                    if (Array.isArray(this.recallData[key])) {
                        const options = elem.find('option')
                        for (let opt of options) {
                            let mod = this.recallData[key].find(x => x.name == $(opt).text().trim())
                            if (mod) opt.selected = mod.selected
                        }
                    } else {
                        if (elem.attr("type") == "checkbox") elem[0].checked = this.recallData[key]
                        else elem.val(this.recallData[key])
                    }
                }
            }
        }

    }
}

