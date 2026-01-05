import { bindImgToCanvasDragStart } from "../hooks/imgTileDrop.js"
import { increaseFontSize } from "../hooks/journal.js"
import DSKStatusEffects from "../status/status_effects.js"
import DSKChatAutoCompletion from "../system/chat_autocompletion.js"
import DSKUtility from "../system/dsk_utility.js"
import { slist } from "../system/view_helper.js"
import DSK from "../system/config.js"
import { DefaultAppv2 } from "../actor/baseapp.js";
import { DragMixin } from "../actor/mixins/drag_mixin.js";
import FlexSearch from "../../libs/flexsearch.bundle.module.min.js"
const { mergeObject, duplicate } = foundry.utils
const { renderTemplate } = foundry.applications.handlebars;
const { TextEditor } = foundry.applications.ux;

export default class BookWizard extends DragMixin(DefaultAppv2) {
    static wizard

    static DEFAULT_OPTIONS = {
        classes: ['dsk', 'largeDialog', 'noscrollWizard', 'bookWizardsheet', 'dskjournalbrowser'],
        position: {
            width: 800,
            height: 880,
        },
        window: {
            resizable: true,
            title: 'dsk.Book.Wizard',
            controls: [
                {
                    action: 'increaseFontSize',
                    label: 'dsk.SHEET.increaseFontSize',
                    icon: 'fas fa-arrows-up-down',
                },
                {
                    action: 'showBooks',
                    label: 'dsk.Book.home',
                    icon: 'fas fa-book',
                },
            ],
        },
        actions: {
            increaseFontSize: this._increaseFontSize,
            showBooks: this._showBooksAction,
            toggleVisibility: this._toggleVisibility,
            showMapNote: this._showMapNote,
            showItem: this._showItem,
            movePage: this._movePage,
            loadBook: this._loadBook,
            getChapter: this._getChapter,
            subChapter: this._subChapter,
            tocCollapser: this._tocCollapser,
            openPin: { handler: this._openPin, buttons: [0, 2] },
            showJournal: this._showJournalAction,
            pinJournal: this._pinJournalAction,
            activateScene: this._activateScene,
            fulltextsearchToggle: this._fulltextsearchToggle,
            importBook: this._importBook,
        },
    };

    static TABS = {
        sheet: {
            tabs: [
                { id: 'description', label: 'Description' },
            ],
            initial: 'description',
        },
    };

    static PARTS = {
        wizard: {
            template: 'systems/dsk/templates/wizard/adventure/adventure_wizard.hbs',
        },
    };

    get template() {
        return BookWizard.PARTS.wizard.template;
    }

    constructor(options = {}) {
        super(options)
        this.adventures = []
        this.books = []
        this.rshs = []
        this.manuals = []
        this.fulltextsearch = true
    }

    // Static action handlers
    static _increaseFontSize(ev, target) {
        increaseFontSize($(this.element).find('.chapter'))
    }

    static _showBooksAction(ev, target) {
        this._showBooks()
    }

    static async _toggleVisibility(ev, target) {
        const id = target.dataset.itemid
        const type = target.dataset.type
        const toggle = $(target).find('i').hasClass("fa-toggle-off")
        this.toggleBookVisibility(id, type, toggle)
    }

    static _showMapNote(ev, target) {
        game.journal.get(target.dataset.entryId).panToNote()
    }

    static async _showItem(ev, target) {
        let itemId = target.dataset.uuid
        const item = await fromUuid(itemId)
        item.sheet.render(true)
    }

    static _movePage(ev, target) {
        this.movePage(target)
    }

    static _loadBook(ev, target) {
        this.loadBook($(target).text(), $(this.element), target.dataset.type)
    }

    static _getChapter(ev, target) {
        this.selectedType = $(target).closest('.tocList').attr("data-type")
        this.selectedChapter = target.dataset.id
        this.content = undefined
        this.pageTocs = undefined
        this.loadPage($(this.element))
    }

    static async _subChapter(ev, target) {
        const name = $(target).text()
        const jid = target.dataset.jid
        if (jid) {
            await this.loadJournalById(jid)
        } else {
            $(this.element).find('.subChapter').removeClass('selected')
            $(this.element).find(`[data-id="${name}"]`).addClass("selected")
            await this.loadJournal(name)
        }

        const html = $(this.element)
        html.find('.tocList').html(await this.getToc())

        if (this.searchString) this.filterToc(this.searchString)
    }

    static _tocCollapser(ev, target) {
        $(target).find('i').toggleClass("fa-chevron-right fa-chevron-left")
        $(this.element).find(".tocCollapsing").toggleClass('expanded')
    }

    static async _openPin(ev, target) {
        const uuid = target.dataset.uuid
        if (ev.button == 0) this.showJournal(await fromUuid(uuid))
        else if (ev.button == 2) this.unpinJournal(uuid)
    }

    static _showJournalAction(ev, target) {
        this.popJournal($(target).closest("h1").attr("data-uuid"))
    }

    static _pinJournalAction(ev, target) {
        const parent = $(target).closest("h1")
        const id = parent.attr("data-uuid")
        const name = parent.text()
        this.pinJournal(id, name)
    }

    static _activateScene(ev, target) {
        this.showSzene(target.dataset.id, target.dataset.mode)
    }

    static _fulltextsearchToggle(ev, target) {
        this.fulltextsearch = !this.fulltextsearch
        $(target).toggleClass("on")
        this.filterToc($(this.element).find('.filterJournals').val())
    }

    static _importBook(ev, target) {
        this.importBook()
    }

    static initHook() {
        BookWizard.wizard = new BookWizard()

        game.dsk.apps.journalBrowser = BookWizard.wizard

        Hooks.on("renderJournalDirectory", (app, html) => {

            html = $(html)
            let div = $('<div class="header-actions action-buttons flexrow"></div>')
            let button = $(`<button id="openJournalBrowser"><i class="fa fa-book"></i>${game.i18n.localize("dsk.Book.Wizard")}</button>`)
            button.on('click', () => { BookWizard.wizard.render(true) })
            div.append(button)
            html.find(".header-actions:first-child").after(div)
        })
    }

    _showBooks() {
        this.book = null
        this.bookData = null
        this.selectedChapter = null
        this.selectedType = null
        this.journals = null
        this.actors = null
        this.scenes = null
        this.content = undefined
        this.journalIndex = null
        this.fulltextsearch = true
        this.searchString = undefined
        this.currentType = undefined
        this.pageTocs = undefined
        this.selectedSubChapter = undefined
        this.loadPage($(this.element))
    }

    async toggleBookVisibility(id, type, toggle) {
        const config = game.settings.get("dsk", "expansionPermissions")
        config[id] = toggle
        await game.settings.set("dsk", "expansionPermissions", config)

        let book = this[type].find(x => x.id == id)
        const json = await (await fetch(book.path)).json()
        const keys = ["actors", "journal", "scenes"]
        for (const key of keys) {
            if (!json[key]) continue

            let pack = game.packs.get(json[key]);
            let visibility = toggle ? "OBSERVER" : "NONE"

            const ownership = {
                ownership: {
                    PLAYER: visibility,
                    TRUSTED: visibility
                }
            }

            await pack.configure(ownership)
        }
        this.render()
    }

    _onRender(context, options) {
        super._onRender(context, options);
        const html = $(this.element);

        html.on("search keyup", ".filterJournals", ev => {
            this.filterToc(ev.currentTarget.value)
        })

        html.on("click", ".heading-link", ev => this._onClickPageLink(ev))

        html.on('mousedown', ".chapter img", ev => {
            let name = this.book.id
            if (ev.button == 2) DSKUtility.showArtwork({ name: name, uuid: "", img: $(ev.currentTarget).attr("src") })
        })

        DSKChatAutoCompletion.bindRollCommands(html)
        DSKStatusEffects.bindButtons(html)
        bindImgToCanvasDragStart(html)
        slist(html, '.breadcrumbs', this.resaveBreadCrumbs)
    }

    async getPagy(chapter, journalId) {
        const journals = this.journals.filter(x => x.flags.dsk.parent == chapter).sort((a, b) => a.flags.dsk.sort > b.flags.dsk.sort ? 1 : -1)
        const targetindex = journals.findIndex(x => x._id == journalId)
        return { journals, targetindex }
    }

    async movePage(target) {
        const dir = target.dataset.direction
        let { journals, targetindex } = await this.getPagy(this.selectedChapter, this.selectedSubChapter)
        let flattenedChapters = []

        for (let chap of this.bookData.chapters) {
            for (let sub of chap.content) {
                flattenedChapters.push(sub.name)
            }
        }

        let curChapterIndex = flattenedChapters.findIndex(x => x == this.selectedChapter)
        this.bookData.chapters.findIndex(x => x.name == this.selectedChapter)

        if (dir == "next") targetindex++
        else targetindex--

        if (targetindex < 0) {
            this.selectedChapter = flattenedChapters[curChapterIndex - 1]
            if (!this.selectedChapter) return

            journals = (await this.getPagy(this.selectedChapter, undefined)).journals
            targetindex = 0
        } else if (targetindex >= journals.length) {
            this.selectedChapter = flattenedChapters[curChapterIndex + 1]
            if (!this.selectedChapter) return

            journals = (await this.getPagy(this.selectedChapter, undefined)).journals
            targetindex = 0
        }

        if (["prep", "foundryUsage"].includes(this.selectedChapter)) return

        let journal = journals[targetindex]

        if (journal) {
            await this.loadJournalById(journal.id)
        }

        const toc = await this.getToc()
        this._saveScrollPositions($(this.element))
        $(this.element).find('.toc').html(toc)
        this._restoreScrollPositions($(this.element))
    }

    async loadJournal(name) {
        await this.showJournal(this.journals.find(x => x.name == name && x.flags.dsk.parent == this.selectedChapter))
    }

    async loadJournalById(id) {
        await this.showJournal(this.journals.find(x => x.id == id))
    }

    async resaveBreadCrumbs(target) {
        const breadcrumbs = {}
        for (let elem of target.getElementsByTagName("div")) {
            breadcrumbs[elem.dataset.uuid] = elem.innerText
        }
        await game.settings.set("dsk", `breadcrumbs_${game.world.id}`, JSON.stringify(breadcrumbs))
    }

    markFindings(html) {
        const container = html.closest('.tocCollapsing')
        container.find('.searchLines').remove()
        const findings = html.find('.searchMatch')

        if (findings.length == 0) return

        const markers = []
        const boundingRect = html.find("> div")[0].getBoundingClientRect()
        for (let finding of findings) {
            const bounding = finding.getBoundingClientRect()
            markers.push(`<div class="marker" style="top:${(bounding.top - boundingRect.top) / boundingRect.height * 100}%"></div>`)

        }
        const lines = $(`<div class="searchLines">${markers.join("")}</div>`)
        container.append(lines)
    }

    async filterToc(val) {
        this.searchString = val
        const html = $(this.element)
        if (val != undefined) {
            val = val.toLowerCase().trim()

            if (val != "") {
                let result = []
                if (this.fulltextsearch) {
                    if (!this.journalIndex) {
                        this.journalIndex = new FlexSearch.Document({
                            tokenize: "full",
                            cache: true,
                            document: {
                                id: "id",
                                store: true,
                                index: ['name', 'data']
                            }
                        });
                        for (const journal of this.journals) {
                            await this.journalIndex.add(new JournalSearch(journal).toObject());
                        }
                    }
                    const query = {
                        index: ['name', 'data']
                    }
                    result = (await this.journalIndex.searchAsync(val, query)).map(x => x.result).flat().map(x => this.journalIndex.get(x))
                } else {
                    result = this.journals.filter(x => {
                        return x.name.toLowerCase().trim().indexOf(val) != -1
                    })
                }
                result = result.map(x => `<li><button type="button" data-jid="${x.id}" data-action="subChapter" class="subChapter"><i class="fas fa-caret-right"></i>${x.name}</button></li>`)

                html.find('.tocContent').html(`<ul>${result.join("\n")}</ul>`)
            } else {
                const content = await this.getToc()
                html.find('.toc').html(content).find(".filterJournals").trigger("focus")
            }
        }

        const journal = await this.getChapter()
        const chapter = html.find('.chapter')
        chapter.html(journal)
        this.markFindings(chapter)
    }

    async showSearchResults(pageContent) {
        if (this.searchString) {
            const html = document.createElement("div");
            html.innerHTML = $(pageContent).html();
            await TextEditor._applyCustomEnrichers({
                pattern: new RegExp(this.searchString, 'ig'),
                enricher: (match, options) => {
                    return $(`<span class="searchMatch">${match[0]}</span>`)[0];
                }
            }, BookWizard.#getTextNodes(html), {});
            return html.innerHTML;
        } else {
            return $(pageContent).html();
        }
    }

    static #getTextNodes(parent) {
        const text = [];
        const walk = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT);
        while (walk.nextNode()) text.push(walk.currentNode);
        return text;
    }

    _onClickPageLink(ev) {
        const anchor = ev.currentTarget.closest("[data-anchor]")?.dataset.anchor;
        if (anchor) {
            const element = this.element.querySelector(`.chapter [data-anchor="${anchor}"]`)
            if (element) {
                element.scrollIntoView({ behavior: "smooth" });
                return;
            }
        }
        const page = this.element.querySelector(`.journalHeader`);
        page?.scrollIntoView({ behavior: "smooth" });
    }

    async _renderHeadings(toc, shiftFirst = false) {
        let headings = Object.values(toc);

        if (shiftFirst) headings.shift();

        headings.sort((a, b) => a.order - b.order);

        const minLevel = Math.min(...headings.map(node => node.level));
        headings = headings.reduce((arr, { text, level, slug, element }) => {
            if (element) element.dataset.anchor = slug;
            if (level < minLevel + 2) arr.push({ text, slug, level: level - minLevel + 2 });
            return arr;
        }, []);
        return await foundry.applications.handlebars.renderTemplate("templates/journal/toc.hbs", { headings });
    }

    async renderContent(journal) {
        this.content = journal.id
        let content = ''
        const pageTocs = []
        for (let page of journal.pages) {
            const sheet = journal.sheet.getPageSheet(page.id)
            let view
            let pageContent

            const pageName = page.name.replace(/ Text$/gi, '');
            const equalName = journal.name == pageName;

            if (sheet.isV2) {
                const oldShow = sheet.page?.title?.show;
                if (oldShow != undefined) sheet.page.title.show = !equalName;
                await sheet.render(true);
                view = sheet.element
                pageContent = view

                if (oldShow != undefined) sheet.page.title.show = oldShow;
            } else {
                const data = await sheet.getData();
                view = (await sheet._renderInner(data)).get();
                pageContent = view[view.length - 1];
            }

            const pageToc = JournalEntryPage.implementation.buildTOC(view)
            pageTocs.push(await this._renderHeadings(pageToc, equalName))

            pageContent = await this.showSearchResults(pageContent);

            if (page.type == "video") pageContent = `<div class="video-container">${pageContent}</div>`
            if (!equalName) pageContent = `<h2 data-anchor="${page.name.slugify()}">${pageName}</h2>${pageContent}`

            content += pageContent
        }

        this.pageTocs = pageTocs.join("")

        const pinIcon = this.findSceneNote(journal.getFlag("dsk", "initId"))
        const enriched = await foundry.applications.ux.TextEditor.enrichHTML(content, { secrets: game.user.isGM })

        return `<div><h1 class="journalHeader" data-uuid="${journal.uuid}">${journal.name}<div class="jrnIcons">${pinIcon}<a data-action="pinJournal"><i class="fas fa-thumbtack"></i></a><a data-action="showJournal"><i class="fas fa-eye"></i></a></div></h1>${enriched}`
    }

    async showJournal(journal) {
        const chapter = $($(this.element)).find('.chapter')
        chapter.html(await this.renderContent(journal))

        this.selectedSubChapter = journal.id

        $($(this.element)).find('.subChapter').removeClass('selected')
        $($(this.element)).find(`[data-jid="${journal.id}"]`).addClass("selected")
        bindImgToCanvasDragStart(chapter)
        this.markFindings(chapter)
        chapter.find('.documentName-link, .content-link').on('click', ev => {
            const dataset = ev.currentTarget.dataset
            if (this.bookData && dataset.pack == this.bookData.journal) {
                //todo make this work for pages
                if (dataset.type != "JournalEntryPage") {
                    ev.stopPropagation()
                    this.loadJournalById(dataset.id)
                }

            }
        })
    }

    findSceneNote(entryId) {
        if (entryId) {
            const importedJournalEntry = game.journal.find(x => x.getFlag("dsk", "initId") == entryId)
            if (importedJournalEntry && importedJournalEntry.sceneNote) return `<a class="showMapNote" data-entry-id="${importedJournalEntry.id}"><i class="fas fa-map-pin"></i></a>`
        }
        return ""
    }

    async importBook() {
        if (game.user.isGM) new InitializerForm().render(this.bookData.moduleName, this.bookData.options)
    }

    async loadBook(id, html, type) {
        this.selectedChapter = undefined
        this.selectedType = undefined
        this.content = undefined

        if (!type) type = this.currentType

        this.currentType = type
        this.book = this[type].find(x => x.id == id)
        await fetch(this.book.path).then(async r => r.json()).then(async json => {
            this.bookData = json
            let journal = game.packs.get(json.journal)
            //Need this to replace links
            await journal.getIndex()
            let entries = await journal.getDocuments()
            this.journals = entries
            if (json.actors) {
                journal = game.packs.get(json.actors)
                entries = await journal.getIndex()
                this.actors = entries
            }
            if (json.scenes) {
                journal = game.packs.get(json.scenes)
                entries = await journal.getIndex()
                this.scenes = entries
            }
            this.checkChapters(journal)
            this.loadPage(html)
        })
    }

    checkChapters(journal) {
        if (this.bookData.chapters) return

        this.bookData.isDynamic = true
        this.bookData.chapters = [
            {
                "name": game.i18n.localize(`${this.bookData.moduleName}.name`),
                "content": journal.folders.map(x => {
                    return {
                        "name": x.name,
                        "id": x.id
                    }
                })
            }
        ]
    }

    async prefillActors(chapter) {
        if (!chapter.actors) return []

        let result = []
        const head = await game.folders.contents.find(x => x.name == game.i18n.localize(`${this.bookData.moduleName}.name`) && x.type == "Actor" && x.folder == null)
        const folderids = head ? await game.folders.contents.filter(x => x.type == "Actor" && x.folder?.id == head.id).map(x => x.id) : undefined
        for (let k of chapter.actors) {
            let actor = folderids?.length ? game.actors.contents.find(x => x.name == k && folderids.includes(x.folder?.id)) : undefined
            let pack = undefined
            let id = actor?.id
            let uuid = actor?.uuid
            if (!actor) {
                actor = this.actors.find(x => x.name == k)
                pack = this.bookData.actors
                id = actor?._id
                uuid = actor ? `Compendium.${pack}.${id}` : undefined
            }
            result.push({
                name: k,
                actor,
                pack,
                id,
                uuid
            })
        }
        return result
    }

    async popJournal(uuid) {
        const entry = await fromUuid(uuid)
        entry.sheet.render(true)
    }

    async showSzene(name, mode = "activate") {
        let scene = game.scenes.contents.find(x => x.name == name)
        if (!scene)
            return ui.notifications.error("dsk.DSKError.sceneNotInitialized", { localize: true })

        switch (mode) {
            case "activate":
                scene.activate()
                break
            case "view":
                scene.view()
                break
            case "toggle":
                scene.update({ navigation: !scene.navigation })
                break
        }
    }

    async getChapter() {
        if (this.book) {
            if (this.content) {
                const journal = this.journals.find(x => x.id == this.content)
                return await this.renderContent(journal)
            }
            if (this.selectedChapter) {
                if (this.selectedChapter == "prep") {
                    let info = {
                        initDescr: game.i18n.format(`${this.bookData.options?.scope || this.bookData.moduleName}.importContent`, { defaultText: game.i18n.localize('dsk.importDefault') })
                    }

                    let modules = this.bookData.modules
                    for (let k of modules) k.enabled = this.moduleEnabled(k.id)

                    return await renderTemplate('systems/dsk/templates/wizard/adventure/adventure_preparation.hbs', { modules, info })
                } else if (this.selectedChapter == "foundryUsage") {
                    return await renderTemplate('systems/dsk/templates/wizard/adventure/adventure_foundry.hbs')
                }

                let chapter = this.bookData.chapters.find(x => x.name == this.selectedType).content.find(x => x.id == this.selectedChapter)
                const subChapters = this.getSubChapters()
                if (chapter.scenes || chapter.actors || subChapters.length == 0) {
                    return await renderTemplate('systems/dsk/templates/wizard/adventure/adventure_chapter.hbs', { chapter, subChapters: this.getSubChapters(), actors: await this.prefillActors(chapter) })
                } else {
                    this.selectedSubChapter = subChapters[0].id
                    return await this.loadJournalById(subChapters[0].id)
                }

            }
            return await renderTemplate('systems/dsk/templates/wizard/adventure/adventure_cover.hbs', { book: this.book, bookData: this.bookData })
        } else {
            return await renderTemplate('systems/dsk/templates/wizard/adventure/adventure_intro.hbs', {
                rshs: this.filterBooks(this.rshs),
                rules: this.filterBooks(this.books),
                adventures: this.filterBooks(this.adventures),
                manuals: this.filterBooks(this.manuals),
                isGM: game.user.isGM
            })
        }
    }

    filterBooks(books) {
        const bookPermissions = game.settings.get("dsk", "expansionPermissions")
        for (const book of books) {
            if (bookPermissions[book.id] != undefined) book.visible = bookPermissions[book.id]
        }
        return game.user.isGM ? books : books.filter(x => x.visible == undefined || x.visible).sort((a, b) => {
            return a.id.localeCompare(b.id)
        })
    }

    getSubChapters() {
        let jrns
        if (this.bookData.isDynamic) {
            jrns = this.journals.filter(x => x.folder.id == this.selectedChapter)
                .sort((a, b) => a.sort > b.sort ? 1 : -1)
        } else {
            jrns = this.journals.filter(x => x.flags.dsk.parent == this.selectedChapter)
                .sort((a, b) => a.flags.dsk.sort > b.flags.dsk.sort ? 1 : -1)
        }

        return jrns.map(x => {
            const selected = this.selectedSubChapter == x.id
            return { name: x.name, id: x.id, selected, cssClass: selected ? "selected" : "" }
        })
    }

    async getToc() {
        let chapters = []
        if (this.book) {
            chapters.push(...duplicate(this.bookData.chapters))
            if (this.selectedChapter) {
                let chapter
                for (let k of chapters) {
                    chapter = k.content.find(x => x.id == this.selectedChapter)
                    if (chapter) break
                }
                if (chapter) {
                    chapter.cssClass = "selected"
                    chapter.subChapters = this.getSubChapters()
                }
            }
            return await renderTemplate('systems/dsk/templates/wizard/adventure/adventure_toc.hbs', {
                chapters,
                searchString: this.searchString,
                book: this.book,
                pageTocs: this.pageTocs,
                fulltextsearch: this.fulltextsearch ? "on" : ""
            })
        } else {
            return '<div class="libraryImg"></div>'
        }

    }

    async loadPage(html) {
        const template = await this.getChapter()
        const toc = await this.getToc()

        html.find('.tocList').html(toc)
        const chapter = html.find('.chapter')
        chapter.html(template)
        this.markFindings(chapter)
    }

    async _prepareContext(_options) {
        const data = await super._prepareContext(_options);
        const currentChapter = await this.getChapter()
        const toc = await this.getToc()
        const index = game.settings.get("dsk", "journalFontSizeIndex")
        const fontSize = DSK.journalFontSizes[index - 1] || 14;
        mergeObject(data, {
            adventure: this.bookData,
            currentChapter,
            breadcrumbs: this.renderBreadcrumbs(),
            toc,
            fontSize
        })
        return data
    }

    async pinJournal(uuid, name = undefined) {
        let breadcrumbs = this.readBreadCrumbs()
        if (!name) name = (await fromUuid(uuid))?.name || ""
        breadcrumbs[uuid] = name
        game.settings.set("dsk", `breadcrumbs_${game.world.id}`, JSON.stringify(breadcrumbs))
        this.render(true)
    }

    unpinJournal(uuid) {
        let breadcrumbs = this.readBreadCrumbs()
        delete breadcrumbs[uuid]
        game.settings.set("dsk", `breadcrumbs_${game.world.id}`, JSON.stringify(breadcrumbs))
        this.render(true)
    }

    _canDragDrop(selector) {
        return true
    }

    async _onDrop(event) {
        let data;
        try {
            data = JSON.parse(event.dataTransfer.getData('text/plain'));
        } catch (err) {
            return false;
        }
        if (data.type == "JournalEntry") {
            this.pinJournal(data.pack ? `Compendium.${data.pack}.${data.id}` : `JournalEntry.${data.id}`)
        }
    }

    readBreadCrumbs() {
        let breadcrumbs = {}
        try {
            breadcrumbs = JSON.parse(game.settings.get("dsk", `breadcrumbs_${game.world.id}`))
        } catch (e) {
            console.log("No Journalbrowser notes found")
        }
        return breadcrumbs
    }

    renderBreadcrumbs() {
        const breadcrumbs = this.readBreadCrumbs()
        const btns = Object.entries(breadcrumbs).map(x => `<div data-tooltip="${x[1]}" data-uuid="${x[0]}" class="openPin item">${x[1]}</div>`)

        if (btns.length > 0) return `<div id="breadcrumbs" class="breadcrumbs wrap row-section">${btns.join("")}</div>`

        return ""
    }

    moduleEnabled(id) {
        if (game.modules.get(id)) {
            return game.modules.get(id).active ? "fa-check" : "fa-dash"
        }
        return "fa-times"
    }
}

class InitializerForm extends FormApplication {
    static _warnedAppV1 = true;

    render(mod, options) {
        new game.dsk.apps.DSKInitializer("DSK Module Initialization", game.i18n.format(`${options?.scope || mod}.importContent`, { defaultText: game.i18n.localize("dsk.importDefault") }), mod, game.i18n.lang, options).render(true)
    }
}

class JournalSearch {
    constructor(item) {
        const data = item.pages.find(x => true).text.content
        this.document = {
            name: item.name,
            data: $("<div>").html(data).text(),
            id: item.id,
        }
    }

    toObject() {
        return {
            name: this.name,
            data: this.data,
            id: this.id,
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
}