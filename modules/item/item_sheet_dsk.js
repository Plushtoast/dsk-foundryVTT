import DSK from "../system/config.js";
import DSKUtility from "../system/dsk_utility.js";
import { svgAutoFit } from "../system/view_helper.js";
import { ItemSheetObfuscation } from "./obfuscatemixin.js";

export default class ItemSheetDSK extends ItemSheet {
    static setupSheets(){
        Items.unregisterSheet("core", ItemSheet)

        Items.registerSheet("dsk", ItemSheetMeleeweapon, { makeDefault: true, types: ["meleeweapon"] });
        Items.registerSheet("dsk", ItemSheetRangeweapon, { makeDefault: true, types: ["rangeweapon"] });
        Items.registerSheet("dsk", ItemSheetArmor, { makeDefault: true, types: ["armor"] });
        Items.registerSheet("dsk", ItemSheetAmmunition, { makeDefault: true, types: ["ammunition"] });
        Items.registerSheet("dsk", ItemSheetEquipment, { makeDefault: true, types: ["equipment"] });
        Items.registerSheet("dsk", ItemSheetSpecies, { makeDefault: true, types: ["species"] });
        Items.registerSheet("dsk", ItemSheetCulture, { makeDefault: true, types: ["culture"] });
        Items.registerSheet("dsk", ItemSheetProfession, { makeDefault: true, types: ["profession"] });
        Items.registerSheet("dsk", ItemSheetAdvantage, { makeDefault: true, types: ["advantage"] });
        Items.registerSheet("dsk", ItemSheetDisadvantage, { makeDefault: true, types: ["disadvantage"] });
        Items.registerSheet("dsk", ItemSheetSpecialability, { makeDefault: true, types: ["specialability"] });
        Items.registerSheet("dsk", ItemSheetAhnengeschenk, { makeDefault: true, types: ["ahnengeschenk"] });
        Items.registerSheet("dsk", ItemSheetAhnengabe, { makeDefault: true, types: ["ahnengabe"] });
        Items.registerSheet("dsk", ItemSheetPoison, { makeDefault: true, types: ["poison"] });
        Items.registerSheet("dsk", ItemSheetSkill, { makeDefault: true, types: ["skill"] });
        Items.registerSheet("dsk", ItemSheetCombatskill, { makeDefault: true, types: ["combatskill"] });
        Items.registerSheet("dsk", ItemSheetInformation, { makeDefault: true, types: ["information"] });
        Items.registerSheet("dsk", ItemSheetEffectwrapper, { makeDefault: true, types: ["effectwrapper"] });
        Items.registerSheet("dsk", ItemSheetTrait, { makeDefault: true, types: ["trait"] });
    }

    _getHeaderButtons() {
        let buttons = super._getHeaderButtons();
        buttons.unshift({
            class: "showItemHead",
            icon: `fas fa-comment`,
            onclick: async() => this.item.postItem()
        })
        return buttons
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.tabs = [{ navSelector: ".tabs", contentSelector: ".content" }]
        mergeObject(options, {
            classes: options.classes.concat(["dsk", "item"]),
            width: 450,
            height: 500,
        });
        return options;
    }

    get template() {
        return `systems/dsk/templates/items/item-${this.item.type}-sheet.html`;
    }

    async getData(options) {
        let data = super.getData(options).data;
        data.isOwned = this.item.actor
        data.editable = this.isEditable
        data.item = this.item
        data.isGM = game.user.isGM
        
        data.enrichedDescription = await TextEditor.enrichHTML(getProperty(this.item.system, "description.value"), {secrets: true, async: true})
        data.enrichedGmdescription = await TextEditor.enrichHTML(getProperty(this.item.system, "description.gminfo"), {secrets: true, async: true})
        return data
    }

    async advanceWrapper(ev, funct) {
        let elem = $(ev.currentTarget)
        let i = elem.find('i')
        if (!i.hasClass("fa-spin")) {
            i.addClass("fa-spin fa-spinner")
            await this[funct]()
            i.removeClass("fa-spin fa-spinner")
        }
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find('[data-edit="img"]').mousedown(ev => {
            if (ev.button == 2) DSKUtility.showArtwork(this.item)
        })

        let toObserve = html.find(".item-header")
        if (toObserve.length) {
            let svg = toObserve.find('svg')
            if (svg) {
                let observer = new ResizeObserver(function(entries) {
                    let entry = entries[0]
                    svgAutoFit(svg, entry.contentRect.width)
                });
                observer.observe(toObserve.get(0));
                let input = toObserve.find('input')
                if (!input.get(0).disabled) {
                    svg.click(() => {
                        svg.hide()
                        input.show()
                        input.focus()
                    })
                    input.blur(function() {
                        svg.show()
                        input.hide()
                    })
                }
            }
        }
    }
}

class ItemSheetTrait extends ItemSheetDSK {
    
}

class ItemSheetEffectwrapper extends ItemSheetDSK {

}

class ItemSheetInformation extends ItemSheetDSK {

}

class ItemSheetMeleeweapon extends ItemSheetObfuscation(ItemSheetDSK){

}

class ItemSheetRangeweapon extends ItemSheetObfuscation(ItemSheetDSK){

}

class ItemSheetArmor extends ItemSheetObfuscation(ItemSheetDSK){

}

class ItemSheetAmmunition extends ItemSheetObfuscation(ItemSheetDSK){

}

class ItemSheetEquipment extends ItemSheetObfuscation(ItemSheetDSK){

}

class ItemSheetSpecies extends ItemSheetDSK{

}

class ItemSheetCulture extends ItemSheetDSK{

}

class ItemSheetProfession extends ItemSheetDSK{

}

class ItemSheetAdvantage extends ItemSheetDSK{

}

class ItemSheetDisadvantage extends ItemSheetDSK{

}

class ItemSheetSpecialability extends ItemSheetDSK{

}

class ItemSheetAhnengeschenk extends ItemSheetDSK{

}

class ItemSheetAhnengabe extends ItemSheetDSK{

}

class ItemSheetPoison extends ItemSheetObfuscation(ItemSheetDSK){

}

class ItemSheetSkill extends ItemSheetDSK{
    async getData(options) {
        const data = await super.getData(options)
        mergeObject(data, {
            characteristics: DSK.characteristics,
            skillGroups: DSK.skillGroups,
            skillBurdens: DSK.skillBurdens,
            hasLocalization: game.i18n.has(`SKILLdescr.${this.item.name}`),
            StFs: DSK.StFs   
        })
        return data
    }
}

class ItemSheetCombatskill extends ItemSheetDSK{

}