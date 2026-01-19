import DSKUtility from "../system/dsk_utility.js";
import DSKDialog from "./dialog-dsk.js";
import DialogShared from "./dialog-shared.js";
const { duplicate } = foundry.utils

export default class DSKpellDialog extends DialogShared {
    static rollChanges = ["defenseMalus"]

    static DEFAULT_OPTIONS = {
        position: {
            width: 700
        },
        window: {
            resizable: true,
        },
    };

    static bigTimes = [5, 30, 120, 480, 960, 1920];

    prepareFormRecall(html) {
        super.prepareFormRecall(html);
        html.find(".spellModifier").trigger("change");
    }

    static getRollButtons(testData, dialogOptions, resolve, reject) {
        let buttons = DSKDialog.getRollButtons(testData, dialogOptions, resolve, reject);
        if (["spell", "liturgy"].includes(testData.source.type)) {
            const LZ = Number(testData.source.system.castingTime.value);
            const progress = testData.source.system.castingTime.progress;
            let modified = testData.source.system.castingTime.modified;
            if (LZ && testData.extra.speaker.token != "emptyActor") {
                const progressLabel = modified > 0 ? ` (${progress}/${modified})` : "";
                buttons.push({
                    action: "reloadButton",
                    label: `${game.i18n.localize("dsk.SPELL.reload")}${progressLabel}`,
                    callback: async (event, button, dialog) => {
                        const dlg = $(button.form);
                        const actor = await DSKUtility.getSpeaker(testData.extra.speaker);
                        let reloadUpdate = { _id: testData.source._id, "system.castingTime.progress": progress + 1 };
                        if (modified == 0) {
                            modified = Number(dlg.find(".castingTime").text()) - 1;
                            reloadUpdate["system.castingTime.modified"] = modified;
                        }
                        await actor.updateEmbeddedDocuments("Item", [reloadUpdate]);
                        const infoMsg = game.i18n.format("dsk.SPELL.isReloading", {
                            actor: testData.extra.actor.name,
                            item: testData.source.name,
                            status: `${progress + 1}/${modified}`,
                        });
                        await ChatMessage.create(DSKUtility.chatDataSetup(infoMsg));
                    },
                });
            }
        }
        return buttons;
    }


    async recalcSpellModifiers(html, event){
        const parent = html
        const source = duplicate(this.dialogData.source)
        let castingTime = parent.find(".castingTime");
        let aspcost = parent.find(".aspcost");
        let reach = parent.find(".reach");
        let maintainCost = parent.find(".maintainCost");

        let bigCasts = parent.find(".ritual").length > 0;

        let maxMods = parent.find(".maxMods");
        if (maxMods.length) {
            const maxModsValue = Number(maxMods.text());
            if (!Number.isNaN(maxModsValue) && parent.find(".spellModifier:checked").length > maxModsValue) {
                if(event) event.currentTarget.checked = false;
                maxMods.addClass("emphasize");
                setTimeout(function() {
                    maxMods.removeClass("emphasize");
                }, 600);
                return;
            }
        }

        let baseAsp = aspcost.attr("data-base") ?? source.system.AeP
        let baseReach = source.system.range
        let baseCastingTime = castingTime.attr("data-base") ?? 2

        let newPosition = baseAsp;

        parent.find(".variableBaseCost")[source.system.variableBaseCost == "true" ? "show" : "hide"]()
        let mod = 0;
        parent.find(".spellModifier[data-cost]:checked").each(function(index, element) {
            newPosition = newPosition * (element.value < 0 ? 0.5 : 2);
            mod += Number(element.value);
        });
        if (newPosition < 1) {
            if(event) event.currentTarget.checked = false;
        } else {
            aspcost.text(newPosition);
            aspcost.attr("data-mod", mod);
        }

        mod = 0;
        newPosition = baseCastingTime;
        parent.find(".spellModifier[data-casting-time]:checked").each(function(index, element) {
            if (bigCasts) {
                let ind = DSKpellDialog.bigTimes.indexOf(Number(newPosition));
                if (ind != undefined) {
                    let newIndex = ind + (element.value > 0 ? 1 : -1);
                    if (newIndex < DSKpellDialog.bigTimes.length && newIndex >= 0) {
                        newPosition = DSKpellDialog.bigTimes[newIndex];
                    } else {
                        ui.notifications.error("dsk.DSKError.CastingTimeLimit", { localize: true });
                    }
                } else {
                    ui.notifications.error("dsk.DSKError.TimeCannotBeParsed", { localize: true });
                }
            } else {
                newPosition = newPosition * (element.value > 0 ? 2 : 0.5);
            }

            mod += Number(element.value);
        });
        if (newPosition < 1) {
            if(event) event.currentTarget.checked = false;
        } else {
            castingTime.text(newPosition);
            castingTime.attr("data-mod", mod);
        }

        mod = 0;
        let newReach = game.i18n.localize("dsk.ReverseSpellRanges." + baseReach);
        reach.text(baseReach);
        parent.find(".spellModifier[data-reach]:checked").each(function(index, element) {
            if (newReach == "self") {
                element.checked = false;
            } else if (newReach == "touch") {
                reach.text("4 " + game.i18n.localize("dsk.step"));
                mod += Number(element.value);
            } else {
                let val = baseReach.split(" ");
                newReach = Number(val[0]);
                if (isNaN(newReach)) {
                    if(event) event.currentTarget.checked = false;
                    ui.notifications.error("dsk.DSKError.RangeCannotBeParsed", { localize: true });
                } else {
                    reach.text(newReach * 2 + " " + game.i18n.localize("dsk.step"));
                    mod += Number(element.value);
                }
            }
        });
        reach.attr("data-mod", mod);
        $(this.element).find(".reloadButton").prop("disabled", Number($(this.element).find(".castingTime").text()) < 2);
    }

    async _onRender(context, options) {
        await super._onRender(context, options);

        const html = $(this.element);
        html.find(".reloadButton").prop("disabled", Number(html.find(".castingTime").text()) < 2);

        html.find(".specAbs").on('mousedown', (ev) => {
            $(ev.currentTarget).toggleClass("active");
            this.recalcSpellModifiers(html);
        });

        html.find(".variableBaseCost").on('change', (ev) => {
            let parent = $(ev.currentTarget).parents(".skill-test");
            let oldVal = parent.find(".aspcost").attr("data-base");
            let newVal = $(ev.currentTarget).val();
            parent.find(".aspcost").attr("data-base", newVal);
            parent.find(".aspcost").text((Number(parent.find(".aspcost").text()) * newVal) / oldVal);
        });

        html.find(".spellModifier").on('change', (event) => this.recalcSpellModifiers(html, event));

        let targets = this.readTargets();

        if (targets.length == 0) {
            this.setRollButtonWarning();
        }

        const that = this;
        this.checkTargets = setInterval(function() {
            targets = that.compareTargets(html, targets);
        }, 500);
    }
}