import DSKUtility from "./dsk_utility.js"
import ADVANCEDFILTERS from "./itemlibrary_advanced_filters.js"
import { DefaultAppv2 } from "../actor/baseapp.js";
const { getProperty, debounce } = foundry.utils
const { renderTemplate } = foundry.applications.handlebars;
//TODO merge existing index with advanced details
//TODO create index with getIndex(fields)
//TODO check if we can use the uuid right from the start

class SearchDocument {
    constructor(item, pack = {}) {
        let filterType = item.documentName || item.type
        switch (item.documentName) {
            case 'Actor':
            case 'Item':
                filterType = item.type
                break
        }
        let data = ""
        if (game.settings.get("dsk", "indexDescription")) {
            switch (filterType) {
                case "creature":
                case "npc":
                case "character":
                    data = getProperty(item, "system.description.value")
                    break
                case 'JournalEntry':
                    data = getProperty(item, "system.content")
                    break
                default:
                    data = getProperty(item, "description.value")
            }
        }

        this.document = {
            name: item.name,
            filterType,
            data: $("<div>").html(data).text(),
            id: item.id || item._id,
            visible: item.visible ? item.visible : true,
            compendium: item.compendium ? item.compendium.metadata.packageName : (pack.packageName || ""),
            pack: item.pack || (pack.packageName ? pack.id : undefined),
            img: item.img
        }
    }

    get uuid() {
        if (this.document.compendium) {
            return `Compendium.${this.document.pack}.${this.document.id}`
        } else {
            switch (this.itemType) {
                case "character":
                case "creature":
                case "npc":
                    return `Actor.${this.id}`
                case "JournalEntry":
                    return `JournalEntry.${this.id}`
                default:
                    return `Item.${this.id}`
            }
        }
    }

    get name() {
        return this.document.name
    }
    get data() {
        return this.document.data
    }
    get id() {
        return this.document.id
    }
    get itemType() {
        return this.document.filterType
    }

    async getItem() {
        return await fromUuid(this.uuid)
    }

    hasPermission() {
        return this.document.visible
    }
    async render() {
        (await this.getItem()).sheet.render(true)
    }
    get compendium() {
        return this.document.compendium
    }
    get img() {
        if (this.itemType == 'JournalEntry') return "systems/dsk/icons/categories/DSK-Auge.webp"

        return this.document.img
    }
}

class AdvancedSearchDocument extends SearchDocument {
    constructor(item, subcategory) {
        super(item)

        const attrs = ADVANCEDFILTERS[subcategory] || []
        for (let attr of attrs) {
            this[attr.attr] = attr.attr.split(".").reduce((prev, cure) => {
                return prev[cure] === undefined ? {} : prev[cure]
            }, item.system)
        }
    }
}

export default class DSKItemLibrary extends DefaultAppv2 {
    static DEFAULT_OPTIONS = {
        id: 'DSKItemLibrary',
        classes: ['dsk', 'itemlibrary'],
        position: {
            width: 800,
            height: 800,
        },
        window: {
            resizable: true,
            title: 'dsk.ItemLibrary',
        },
        actions: {
            toggleAdvancedMode: this._toggleAdvancedMode,
            filterChange: this._filterChange,
            filterItem: this._filterItem,
            itemName: { handler: this._itemName, buttons: [0, 2] },
            showDetails: this._showDetails,
            toggleWorldIndex: this._toggleWorldIndex,
            fulltextsearch: this._fulltextsearch,
            tabClick: this._tabClick,
        },
    };

    static PARTS = {
        library: {
            template: 'systems/dsk/templates/system/itemlibrary.html',
        },
    };

    static TABS = {
        sheet: {
            tabs: [
                { id: 'equipment', label: 'Equipment' },
                { id: 'character', label: 'Character' },
                { id: 'spell', label: 'Spell' },
                { id: 'journal', label: 'Journal' },
                { id: 'zoo', label: 'Zoo' },
            ],
            initial: 'equipment',
        },
    };

    get template() {
        return DSKItemLibrary.PARTS.library.template;
    }

    constructor(options = {}) {
        super(options)
        this.advancedFiltering = false
        this.journalBuild = false
        this.journalWorldBuild = false
        this.equipmentBuild = false
        this.equipmentWorldBuild
        this.zooBuild = false
        this.zooWorldBuild = false
        this.currentDetailFilter = {
            equipment: [],
            character: [],
            spell: [],
            journal: [],
            zoo: []
        }
        this.journalIndex = new FlexSearch({
            encode: "simple",
            tokenize: "reverse",
            cache: true,
            doc: {
                id: "id",
                field: [
                    "name",
                    "data"
                ],
            }
        });
        this.equipmentIndex = new FlexSearch({
            encode: "simple",
            tokenize: "reverse",
            cache: true,
            doc: {
                id: "id",
                field: [
                    "name",
                    "data",
                    "itemType"
                ],
            }
        });
        this.zooIndex = new FlexSearch({
            encode: "simple",
            tokenize: "reverse",
            cache: true,
            doc: {
                id: "id",
                field: [
                    "name",
                    "data",
                    "itemType"
                ],
            }
        });

        this.detailFilter = {}

        this.pages = {
            equipment: {},
            character: {},
            spell: {},
            journal: {},
            zoo: {}
        }

        this.filters = {
            equipment: {
                categories: {
                    "armor": false,
                    "ammunition": false,
                    "equipment": false,
                    "meleeweapon": false,
                    "rangeweapon": false,
                    "poison": false,
                },
                filterBy: {
                    search: ""
                }
            },
            character: {
                categories: {
                    "profession": false,
                    "advantage": false,
                    "culture": false,
                    "disadvantage": false,
                    "trait": false,
                    "skill": false,
                    "specialability": false,
                    "species": false,
                },
                filterBy: {
                    search: ""
                }
            },
            spell: {
                categories: {
                    "ahnengabe": false,
                    "ahnengeschenk": false
                },
                filterBy: {
                    search: ""
                }
            },
            journal: {
                categories: {},
                filterBy: {
                    search: ""
                }
            },
            zoo: {
                categories: {
                    "npc": false,
                    "character": false,
                    "creature": false
                },
                filterBy: {
                    search: ""
                }
            },

        }

    }

    async _prepareContext(options) {
        const data = {}
        data.categories = this.translateFilters()
        data.isGM = game.user.isGM
        data.items = this.items
        data.advancedMode = this.advancedFiltering ? "on" : ""
        data.worldIndexed = game.settings.get("dsk", "indexWorldItems") ? "on" : ""
        data.fullTextEnabled = game.settings.get("dsk", "indexDescription") ? "on" : ""
        if (this.advancedFiltering) {
            data.advancedFilter = await this.buildDetailFilter("tbd", this.subcategory)
        }
        return data
    }

    translateFilters() {
        return {
            equipment: this.buildFilter(this.filters.equipment),
            character: this.buildFilter(this.filters.character),
            spell: this.buildFilter(this.filters.spell),
            zoo: this.buildFilter(this.filters.zoo),
            journal: this.buildFilter(this.filters.journal)
        }
    }

    purgeAdvancedFilters() {
        for (let key in this.filters) {
            for (let subkey in this.filters[key]["categories"]) {
                this.filters[key]["categories"][subkey] = false
            }
        }
        $(this.element).find('.filter[type="checkbox"]').prop("checked", false)
        this.buildDetailFilter("none", "none").then(templ => {
            $(this.element).find('.advancedSearch .groupbox').html(templ)
        })
    }

    buildFilter(elem) {
        let res = []
        Object.keys(elem.categories).forEach(function (key) {
            res.push({ label: game.i18n.localize(`TYPES.Item.${key}`), selected: elem.categories[key], key: key })
        })
        res = res.sort(function (a, b) {
            return a.label.localeCompare(b.label);
        });
        return res
    }

    async getRandomItems(category, limit) {
        let filteredItems = []
        let index = this.equipmentIndex
        filteredItems.push(...(await index.search(category, { field: ["itemType"] })))
        return (await Promise.all(this.shuffle(filteredItems.filter(x => x.hasPermission)).slice(0, limit + 5).map(x => x.getItem()))).filter(x => {
            const enchantments = x.getFlag("dsk", "enchantments")
            return !enchantments || !enchantments.find(x => x.talisman)
        }).slice(0, limit)
    }

    shuffle(array) {
        let currentIndex = array.length,
            temporaryValue, randomIndex;

        while (0 !== currentIndex) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }

        return array;
    }

    async findCompendiumItem(search, category, filterCompendium = true) {
        if (!this.equipmentBuild) {
            await this.buildEquipmentIndex()
        }
        let query = {
            field: ["name"],
            where: { itemType: category }
        }
        let result = await this.equipmentIndex.search(search, query)
        if (filterCompendium) result = result.filter(x => x.compendium != "")

        return await Promise.all(result.map(x => x.getItem()))
    }

    async getCategoryItems(category, asItem = false) {
        await this.buildEquipmentIndex()
        if (asItem) return (await Promise.all(this.equipmentIndex.search(category, { field: ["itemType"] }).map(x => x.getItem()))).map(x => x.toObject())

        return this.equipmentIndex.search(category, { field: ["itemType"] })
    }

    async executeAdvancedFilter(search, index, selectSearches, textSearches, booleanSearches, rangeSearches = []) {
        const selFnct = (x) => {
            for (let k of selectSearches) {
                if (k[2] ? (x[k[0]] != k[1]) : (x[k[0]].indexOf(k[1]) == -1)) return false
            }
            return true
        }
        const txtFnct = (x) => {
            for (let k of textSearches) {
                if (x[k[0]].toLowerCase().indexOf(k[1]) == -1) return false
            }
            return true
        }
        const cbFnct = (x) => {
            for (let k of booleanSearches) {
                if (x[k[0]] != k[1]) return false
            }
            return true
        }

        const rangeFct = (x) => {
            for (let k of rangeSearches) {
                if (x[k[0]] < k[1] || x[k[0]] > k[2]) return false
            }
            return true
        }

        let result = index.where(x => (
            search == "" ||
            x.name.toLowerCase().indexOf(search) != -1) &&
            selFnct(x) &&
            txtFnct(x) &&
            cbFnct(x) &&
            rangeFct(x)
        )

        //this.pages[category].next = result.length

        let filteredItems = result
        filteredItems = filteredItems.filter(x => x.hasPermission).sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase()) ? 1 : -1)

        return filteredItems
    }

    async advancedFilterStuff(category, page) {
        const dataFilters = $(this.element).find('.detailFilters')
        const subcategory = dataFilters.attr("data-subc")
        let search = this.filters[category].filterBy.search.toLowerCase()
        let index = this.detailFilter[subcategory]

        const sels = []
        const inps = []
        const checkboxes = []
        for (let elem of dataFilters.find('select')) {
            let val = $(elem).val()
            if (val != "") {
                sels.push([$(elem).attr("name"), val, elem.dataset.notstrict != "true"])
            }
        }
        for (let elem of dataFilters.find('input[type="text"]:not(.manualFilter)')) {
            let val = $(elem).val()
            if (val != "") {
                inps.push([$(elem).attr("name"), val.toLowerCase()])
            }
        }
        for (let elem of dataFilters.find('input[type="checkbox"]:checked:not(.manualFilter)')) {
            let val = $(elem).val()
            if (val != "") {
                checkboxes.push([$(elem).attr("name"), val.toLowerCase()])
            }
        }
        let result = await this.executeAdvancedFilter(search, index, sels, inps, checkboxes)
        this.setBGImage(result, category)
        return result
    }

    async filterStuff(category, index, page) {
        let search = this.filters[category].filterBy.search

        let fields = {
            field: ["name", "data"]
        }
        let filteredItems = []

        let oneFilterSelected = false
        for (let filter in this.filters[category].categories) {
            if (this.filters[category].categories[filter]) {
                let result
                let next = null
                if (search == "") {
                    result = index.search(filter, { field: ["itemType"], sort: "name", where: { itemType: filter } })
                } else {
                    result = index.search(search, { ...fields, sort: "name", where: { itemType: filter } })
                }

                let startIndex = Number(page) || 0
                result = result.slice(startIndex, Math.min(startIndex + 60, result.length))

                if (result.length == 60) next = `${startIndex + 60}`

                this.pages[category].next = next
                filteredItems.push(...result)
            }
            oneFilterSelected = this.filters[category].categories[filter] || oneFilterSelected
        }

        if (!oneFilterSelected) {
            filteredItems = index.search(search, { ...fields, limit: 60, page: page || true, sort: "name" })
            this.pages[category].next = filteredItems.next
        }

        filteredItems = filteredItems.result ? filteredItems.result : filteredItems
        filteredItems = filteredItems.filter(x => x.hasPermission)
        this.setBGImage(filteredItems, category)

        return filteredItems
    }

    setBGImage(filterdItems, category) {
        $(this.element).find(`.${category} .libcontainer`)[`${filterdItems.length > 0 ? "remove" : "add"}Class`]("libraryImg")
    }

    renderResult(html, filteredItems, { index, itemType }, isPaged) {
        let resultField = html.find('.searchResult .item-list')
        renderTemplate('systems/dsk/templates/system/libraryItem.html', { items: filteredItems }).then(innerhtml => {
            if (!isPaged) resultField.empty()

            innerhtml = $(innerhtml)
            innerhtml.each(function () {
                const li = $(this)
                li.attr("draggable", true).on("dragstart", event => {
                    let item = index.find($(li).attr("data-item-id"))
                    event.originalEvent.dataTransfer.setData("text/plain", JSON.stringify({
                        type: itemType,
                        uuid: item.uuid
                    }))
                })
            })
            resultField.append(innerhtml)
        });
    }

    async filterItems(html, category, page) {
        const index = this.selectIndex(category)
        if (this.advancedFiltering && category != "journal") {
            const filteredItems = await this.advancedFilterStuff(category, page)
            this.renderResult(html, filteredItems, index, page)
            return filteredItems;
        } else {
            const filteredItems = await this.filterStuff(category, index.index, page)
            this.renderResult(html, filteredItems, index, page)
            return filteredItems;
        }
    }

    selectIndex(category) {
        let itemType = "Item"
        let index = this.equipmentIndex
        switch (category) {
            case "zoo":
                itemType = "Actor"
                index = this.zooIndex
                break
            case "journal":
                itemType = "JournalEntry"
                index = this.journalIndex
                break
        }
        return { index, itemType }
    }

    async render(options = {}, _options = {}) {
        const result = await super.render(options, _options)
        this.buildEquipmentIndex()
        return result
    }

    async buildEquipmentIndex() {
        await this._createIndex("equipment", "Item", game.items)
    }

    async _createIndex(category, document, worldStuff) {
        if (this[`${category}Build`]) return

        const progress = ui.notifications.info('dsk.Library.loading', { format: { item: "" }, progress: true });
        const target = $(this.element).find(`*[data-tab="${category}"]`)
        this.showLoading(target, category)
        const packs = game.packs.filter(p => p.documentName == document && (game.user.isGM || p.visible))
        const percentage = 1 / (packs.length + 1)
        let count = percentage
        const actorFields = ["name", "system.type", "system.description.value", "img"]
        let func
        if (document == "Actor") {
            func = (p) => { return p.getIndex({ actorFields }) }
        } else if (document == "JournalEntry") {
            func = (p) => { return p.getDocuments() }
        } else {
            func = (p) => { return p.getDocuments({ type__in: Object.keys(game.system.documentTypes.Item) }) }
        }
        const items = this.indexWorldItems(worldStuff, category)
        progress.update({
            message: 'dsk.Library.loading',
            format: { item: "world items" },
            pct: 0.1
        });

        let promise = packs.map(async (p) => {
            const index = await func(p)
            count += percentage
            progress.update({
                message: 'dsk.Library.loading',
                format: { item: `${p.metadata.label} (${p.metadata.id})` },
                pct: count
            });
            items.push(...index.map(x => new SearchDocument(x, p.metadata)))
        })

        await Promise.all(promise)        
        
        this[`${category}Index`].add(items)
        this[`${category}Build`] = true
        

        progress.update({
            message: 'dsk.Library.loading',
            format: { item: '' },
            pct: 1
        });
       this.hideLoading(target, category)
    }

    subcategoryFields(subcategory) {
        let field = ["name", "itemType"]
        const attrs = ADVANCEDFILTERS[subcategory] || []
        for (let attr of attrs) {
            field.push(attr.attr)
        }
        return field
    }

    indexWorldItems(worldStuff, category) {
        const items = []
        if (game.settings.get("dsk", "indexWorldItems")) {
            items.push(...worldStuff.filter(x => x.visible).map(x => new SearchDocument(x)))
            this[`${category}WorldBuild`] = true
        }
        return items
    }


    async createDetailIndex(category, subcategory) {
        if (!this.detailFilter[subcategory]) {
            const field = this.subcategoryFields(subcategory)
            const target = $(this.element).find(`*[data-tab="${category}"]`)
            target.find('.searchResult ul').html('')
            this.showLoading(target, category)
            this.detailFilter[subcategory] = new FlexSearch({
                encode: "simple",
                tokenize: "full",
                cache: true,
                doc: {
                    id: "id",
                    field
                }
            });

            const { index, itemType } = this.selectIndex(category)
            const worldStuff = itemType == "Item" ? game.items : game.actors
            let items = worldStuff.filter(x => x.visible && x.type == subcategory).map(x => new AdvancedSearchDocument(x, subcategory))

            const result = index.search(subcategory, { field: ["itemType"] })
            const pids = {}
            for (let res of result) {
                if (!res.document.pack) continue
                if (!pids[res.document.pack]) pids[res.document.pack] = []
                pids[res.document.pack].push(res.document.id)
            }
            const promises = []
            for (const key of Object.entries(pids)) {
                promises.push(game.packs.get(key[0]).getDocuments({ _id__in: key[1], type: subcategory }))
            }

            let final = await Promise.all(promises)
            for (let k of final) {
                items.push(...k.map(x => new AdvancedSearchDocument(x, subcategory)))
            }
            this.detailFilter[subcategory].add(items)
            this.hideLoading(target, category)
        }
    }

    async buildDetailFilter(category, subcategory) {
        const fields = ADVANCEDFILTERS[subcategory] || []

        if (fields) {
            let bindex = this.createDetailIndex(category, subcategory)
            const template = await renderTemplate("systems/dsk/templates/system/detailFilter.html", { fields, subcategory })
            await bindex
            return template
        } else {
            return `<p>${game.i18n.localize('dsk.Library.selectAdvanced')}</p>`
        }
    }

    checkWorldStuffIndex() {
        if (game.settings.get("dsk", "indexWorldItems")) {
            if (!this.journalWorldBuild && this.journalBuild) {
                this.journalIndex.add(this.indexWorldItems(game.journal, "journal"))
            }
            if (!this.equipmentWorldBuild && this.equipmentBuild) {
                this.equipmentIndex.add(this.indexWorldItems(game.items, "equipment"))
            }
            if (!this.zooWorldBuild && this.zooBuild) {
                this.zooIndex.add(this.indexWorldItems(game.actors, "zoo"))
            }
        }
    }

    // Static action handlers
    static _toggleAdvancedMode(ev, target) {
        this.advancedFiltering = !this.advancedFiltering
        if (this.advancedFiltering) {
            $(this.element).find('.toggleAdvancedMode').addClass("on")
            $(this.element).find('.advancedSearch').fadeIn()
            this.purgeAdvancedFilters()
        } else {
            $(this.element).find('.toggleAdvancedMode').removeClass("on")
            $(this.element).find('.advancedSearch').fadeOut()
        }
    }

    static async _filterChange(ev, target) {
        const tab = $(this.element).find('.tab.active')
        const category = tab.attr("data-tab")
        this.filterItems(tab, category);
    }

    static async _filterItem(ev, target) {
        const tab = $(target).closest('.tab')
        const category = tab.attr("data-tab")
        const subcategory = $(target).attr("data-category")
        const isChecked = $(target).is(":checked")
        if (this.advancedFiltering && isChecked) {
            this.purgeAdvancedFilters()
            this.subcategory = subcategory
            $(target).prop("checked", isChecked)
            $(this.element).find('.advancedSearch .groupbox').html(await this.buildDetailFilter(category, subcategory))
        }
        this.filters[category].categories[subcategory] = isChecked
        this.filterItems(tab, category);
    }

    static _itemName(ev, target) {
        if (ev.button == 2) {
            DSKUtility.showArtwork(this.getItemFromHTML(ev))
        } else {
            this.getItemFromHTML(ev).render()
        }
    }

    static _showDetails(ev, target) {
        const tab = $(target).attr("data-btn")
        $(target).find('i').toggleClass("fa-caret-left fa-caret-right")
        $(this.element).find(`.${tab} .detailBox`).toggleClass("dskhidden")
    }

    static _toggleWorldIndex(ev, target) {
        game.settings.set("dsk", "indexWorldItems", !game.settings.get("dsk", "indexWorldItems"))
        this.checkWorldStuffIndex()
        $(target).toggleClass("on")
    }

    static _fulltextsearch(ev, target) {
        game.settings.set("dsk", "indexDescription", !game.settings.get("dsk", "indexDescription"))
        $(target).toggleClass("on")
    }

    static _tabClick(ev, target) {
        const tabName = target.dataset.tab
        if (tabName === "journal") {
            this._createIndex("journal", "JournalEntry", game.journal)
        } else if (tabName === "zoo") {
            this._createIndex("zoo", "Actor", game.actors)
        }
    }

    _onRender(context, options) {
        super._onRender(context, options);
        const html = $(this.element);

        html.on("change", ".detailFilters input, .detailFilters select", () => {
            const tab = $(this.element).find('.tab.active')
            const category = tab.attr("data-tab")
            this.filterItems(tab, category);
        })

        html.on("keyup", ".filterBy-search", ev => {
            const tab = $(ev.currentTarget).closest('.tab')
            const category = tab.attr("data-tab")
            this.filters[category].filterBy.search = $(ev.currentTarget).val();
            this.filterItems(tab, category);
        })

        const source = this

        $(this.element).find('.window-content').on('scroll.infinit', debounce(function (ev) {
            if (source.advancedFiltering) return

            const log = $(ev.target);
            const pct = (log.scrollTop() + log.innerHeight()) >= log[0].scrollHeight - 100;
            const category = html.find('.tabs .item.active').attr("data-tab")
            if (pct && source.pages[category].next) {
                const tab = html.find('.tab.active')
                source.filterItems.call(source, tab, category, source.pages[category].next)
            }
        },
            100));
    }

    getItemFromHTML(ev) {
        const itemId = $(ev.currentTarget).parents(".browser-item").attr("data-item-id")
        const type = $(ev.currentTarget).closest('.tab').attr("data-tab")
        switch (type) {
            case "zoo":
                return this.zooIndex.find(itemId)
            case "journal":
                return this.journalIndex.find(itemId)
            default:
                return this.equipmentIndex.find(itemId)
        }
    }

    showLoading(html, category) {
        this.setBGImage([1], category)
        const loading = $(`<div class="loader"><i class="fa fa-4x fa-spinner fa-spin"></i>${game.i18n.localize('dsk.Library.buildingIndex')}</div>`)
        loading.appendTo(html.find('.searchResult'))
    }

    hideLoading(html, category) {
        this.setBGImage([], category)
        html.find('.loader').remove()
    }
}