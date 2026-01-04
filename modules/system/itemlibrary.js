import DSKUtility from "./dsk_utility.js"
import ADVANCEDFILTERS from "./itemlibrary_advanced_filters.js"
import { DefaultAppv2 } from "../actor/baseapp.js";
import DSK from "./config.js";
import ItemLibraryIndexLoader from "./itemlibrary/indexLoader.js";
const { getProperty, debounce, duplicate } = foundry.utils
const { renderTemplate } = foundry.applications.handlebars;

class SearchDocument {
  static cachedKeys = {
    Item: {},
    Actor: {},
  }

  static getSearchFields(documentName, type) {
    const cached = this.cachedKeys[documentName][type]

    if (!cached) {
      const fields = ["name", "img", "type"]
      const descriptionKey = game.dsk.itemLibrary?.fullTextSearch ? this.getDescriptionKey(documentName, type) : undefined
      this.cachedKeys[documentName][type] = { fields, descriptionKey }
    }

    return this.cachedKeys[documentName][type]
  }

  static getDescriptionKey(documentName, type) {
    switch (documentName) {
      case 'Actor':
      case 'Item':
        return 'system.description.value'
      default:
        return 'description.value'
    }
  }

  static toJournalSearchableObject(item) {
    return {
      uuid: item.uuid,
      name: item.name,
      compendium: item.pack,
      img: 'systems/dsk/icons/categories/DSK-Auge.webp',
      type: 'JournalEntry',
      description: item.pages.map(x => x.text?.content).join(" ")
    }
  }

  static toSearchableObject(item, documentName) {
    if (documentName === "JournalEntry") return this.toJournalSearchableObject(item);

    const { descriptionKey, fields } = this.getSearchFields(documentName, item.type);
    const object = {
      uuid: item.uuid,
      compendium: item.pack || ''
    };

    if (DSK.equipmentCategories.has(item.type)) {
      object.price = foundry.utils.getProperty(item, "system.price.value") || 0;
    }

    if (descriptionKey) {
      object.description = foundry.utils.getProperty(item, descriptionKey) || "";
    }

    for (const field of fields) {
      object[field] = foundry.utils.getProperty(item, field) || "";
    }

    return object;
  }
}

class AdvancedSearchDocument extends SearchDocument {
  static toSearchableObject(item, subcategory) {
    const object = super.toSearchableObject(item, item.documentName)

    const attrs = ADVANCEDFILTERS[subcategory] || [];
    for (let attr of attrs) {
      object[attr.attr] = attr.attr.split('.').reduce((prev, cure) => {
        return prev[cure] === undefined ? {} : prev[cure];
      }, item.system);
    }
    return object;
  }
}

class DSKSystemConfiguration {
  static hasDescription = {
    "Item": {
      default: "system.description.value"
    },
    "Actor": {
      default: "system.description.value"
    },
    "JournalEntry": {
      default: "description"
    }
  }

  static documentGroups = { "equipment": 0, "character": 0, "spell": 0, "zoo": 1, "journal": 2 }
  static documentNames = ["Item", "Actor", "JournalEntry"]

  static skipCategories = ["base", "information", "effectwrapper"]

  static initialize() {
    // Can be extended later
  }

  static documentNameFromGroup(documentGroup) {
    return this.documentNames[this.documentGroups[documentGroup]]
  }

  static categoryByType(documentName, type) {
    switch (documentName) {
      case "Item":
        if (DSK.equipmentCategories.has(type) || ["poison"].includes(type)) return "equipment"
        if (DSK.magicCategories.has(type)) return "spell"
        return "character"
      case "Actor":
        return "zoo"
      default:
        return "journal";
    }
  }

  static getDescription(item) {
    const descriptionKey = this.getDescriptionKey(item)
    return descriptionKey ? foundry.utils.getProperty(item, descriptionKey) : ""
  }

  static getDescriptionKey(item) {
    return foundry.utils.getProperty(this.hasDescription, `${item.documentName}.${item.type}`) || foundry.utils.getProperty(this.hasDescription, `${item.documentName}.default`)
  }

  static async renderTooltip(item, fullTextSearch) {
    const description = this.getDescription(item, fullTextSearch)
    const langKey = `TYPES.${item.documentName}.${item.type}`
    const type = game.i18n.has(langKey) ? game.i18n.localize(langKey) : item.type
    return await renderTemplate("systems/dsk/templates/system/itemHover.hbs", { item, description, type })
  }

  static getSearchFields(documentName, type, fullTextSearch) {
    const fields = { index: ["name"] }

    if (fullTextSearch) {
      const descriptionKey = this.getDescriptionKey({ documentName, type })
      if (descriptionKey) fields.index.push("description")
    }
    return fields
  }
}

export default class DSKItemLibrary extends DefaultAppv2 {
  pageSize = 60
  filterLimit = 10000
  searchDebounceMs = 200

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
      template: 'systems/dsk/templates/system/itemlibrary.hbs',
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
      labelPrefix: 'dsk.TABS.',
    },
  };

  get template() {
    return DSKItemLibrary.PARTS.library.template;
  }

  constructor(options = {}) {
    super(options)

    this._debouncedFilterItems = foundry.utils.debounce((category) => {
      this.filterItems(category);
    }, this.searchDebounceMs);

    this.indexLoader = new ItemLibraryIndexLoader();
    this.advancedFiltering = false
    
    // Initialize indexes synchronously to avoid race conditions with _onRender
    this.indexes = {}
    this.detailFilter = {}
    this.detailStoreBySubcategory = {}
    this.candidateUuidsBySubcategory = {}
    this.detailEnrichmentInFlight = {}
    this.models = {}
    this._modelsInitialized = false

    // Store the init promise so _onRender can await it
    this._initPromise = this.loadSystemSpecificConfig().then(() => {
      this.prepareIndexes()
    })
  }

  async loadSystemSpecificConfig() {
    this.systemConfiguration = DSKSystemConfiguration
    this.systemConfiguration.initialize()
    // Settings may not be registered yet during init hook - use try/catch with default
    try {
      this.fullTextSearch = game.settings.get("dsk", "indexDescription") && this.systemConfiguration.hasDescription
    } catch {
      this.fullTextSearch = false
    }
  }

  prepareIndexes() {
    this.indexes = {}
    this.detailFilter = {}
    this.detailStoreBySubcategory = {}
    this.candidateUuidsBySubcategory = {}
    this.detailEnrichmentInFlight = {}

    for (let className of this.systemConfiguration.documentNames) {
      this.indexes[className] = {
        documentName: className,
        search: "",
        index: null,
        store: {},
        build: false,
        worldBuild: false,
        next: undefined,
        workerReady: false,
        buildToken: 0
      }
    }
  }

  prepareDataModels() {
    this.models = {}

    for (const documentName of this.systemConfiguration.documentNames) {
      const modelData = Object.keys(game.model[documentName]).filter(x => !this.systemConfiguration.skipCategories.includes(x))

      for (const key of modelData) {
        const category = this.systemConfiguration.categoryByType(documentName, key)
        if (!this.models[category]) this.models[category] = []
        const langKey = `TYPES.${documentName}.${key}`
        this.models[category].push({
          label: game.i18n.has(langKey) ? game.i18n.localize(langKey) : key,
          selected: false,
          key
        })
      }
    }
    for (let key of Object.keys(this.models)) {
      this.models[key].sort((a, b) => a.label.localeCompare(b.label))
    }
  }

  async _prepareContext(options) {
    // Prepare data models on first context preparation (when i18n is ready)
    if (!this._modelsInitialized) {
      this.prepareDataModels()
      this._modelsInitialized = true
    }
    
    const data = {}
    data.categories = this.translateFilters()
    data.isGM = game.user.isGM
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
      equipment: this.models?.equipment || [],
      character: this.models?.character || [],
      spell: this.models?.spell || [],
      zoo: this.models?.zoo || [],
      journal: this.models?.journal || []
    }
  }

  async setAdvancedFilters(category = 'none', subcategory = 'none') {
    for (let key in this.models) {
      for (let subkey of this.models[key]) {
        subkey.selected = false;
      }
    }
    const html = $(this.element)
    html.find('.filter[type="checkbox"]').prop('checked', false);
    let templ = await this.buildDetailFilter('none', 'none')
    html.find('.advancedSearch .groupbox').html(templ);
  }

  async getRandomItems(category, limit) {
    const filteredItems = await this.flattenedResults(this.indexes.Item, '', { tag: category, limit: this.filterLimit });

    const shuffledItems = this.shuffle(filteredItems)
      .slice(0, limit + 5)
      .map(x => this._getStoredObject(this.indexes.Item, x));

    const documents = await Promise.all(shuffledItems.map(x => fromUuid(x.uuid)));
    return documents
      .filter(x => {
        const enchantments = x.getFlag('dsk', 'enchantments');
        return !enchantments || !enchantments.some(enchant => enchant.talisman);
      })
      .slice(0, limit);
  }

  shuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  async findCompendiumItem(search, category, filterCompendium = true) {
    await this.buildItemIndex();

    const query = {
      index: ["name"],
      tag: [category],
    };

    let result = await this.flattenedResults(this.indexes.Item, search, query);
    let items = result.map(x => this._getStoredObject(this.indexes.Item, x));

    if (filterCompendium) {
      items = items.filter(x => x.compendium);
    }

    items.sort((a, b) => {
      const aIsCore = a.compendium?.startsWith('dsk-core') || false;
      const bIsCore = b.compendium?.startsWith('dsk-core') || false;

      if (aIsCore && !bIsCore) return 1;
      if (!aIsCore && bIsCore) return -1;
      return 0;
    });

    return Promise.all(items.map(x => fromUuid(x.uuid)));
  }

  async getCategoryItems(category, asItemData = false, asItem = false) {
    await this.buildItemIndex();
    const indexResults = await this.flattenedResults(this.indexes.Item, '', { tag: [category], limit: this.filterLimit });
    const items = indexResults.map(x => this._getStoredObject(this.indexes.Item, x));

    if (!asItemData && !asItem) return items;

    const documents = await Promise.all(items.map(x => fromUuid(x.uuid)));
    return asItemData ? documents.map(x => x.toObject()) : documents;
  }

  async executeAdvancedFilter(search, indexWrapper, selectSearches, textSearches, booleanSearches, rangeSearches = [], startIndex = 0, returnAll = false) {
    const store = indexWrapper?.store || indexWrapper?.index?.store;
    if (!store) return [];

    const candidates = indexWrapper?.candidates;
    const values = candidates?.length ? candidates.map(uuid => store[uuid]).filter(Boolean) : Object.values(store);

    const searchLower = search.toLowerCase();
    const filterFunction = (item) => {
      if (searchLower && !item.name.toLowerCase().includes(searchLower)) return false;

      for (const [attr, value, isStrict] of selectSearches) {
        if (isStrict ? item[attr] != value : !item[attr]?.includes(value)) return false;
      }

      for (const [attr, value] of textSearches) {
        if (!item[attr]?.toLowerCase().includes(value)) return false;
      }

      for (const [attr, value] of booleanSearches) {
        if (item[attr] !== value) return false;
      }

      for (const [attr, min, max] of rangeSearches) {
        const val = item[attr];
        if (val < min || val > max) return false;
      }

      return true;
    };

    const allResults = values
      .filter(filterFunction)
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

    const paginatedResults = returnAll ? allResults : allResults.slice(
      startIndex,
      Math.min(startIndex + this.pageSize, allResults.length)
    );

    if (indexWrapper) {
      indexWrapper.next = startIndex + this.pageSize < allResults.length ?
        startIndex + this.pageSize :
        undefined;
    }

    return paginatedResults;
  }

  collectDetailSearch(htmlElement) {
    const sels = [];
    const inps = [];
    const checkboxes = [];

    htmlElement.find('select').each((_, elem) => {
      const $elem = $(elem);
      const val = $elem.val();
      if (val !== '') {
        sels.push([$elem.attr('name'), val, elem.dataset.notstrict !== 'true']);
      }
    });

    htmlElement.find('input[type="text"]:not(.manualFilter)').each((_, elem) => {
      const $elem = $(elem);
      const val = $elem.val();
      if (val !== '') {
        inps.push([$elem.attr('name'), val.toLowerCase()]);
      }
    });

    htmlElement.find('input[type="checkbox"]:checked:not(.manualFilter)').each((_, elem) => {
      const $elem = $(elem);
      const val = $elem.val();
      if (val !== '') {
        checkboxes.push([$elem.attr('name'), val.toLowerCase() == 'true']);
      }
    });

    return { sels, inps, checkboxes };
  }

  async advancedFilterStuff(documentGroup, page) {
    const dataFilters = $(this.element).find('.detailFilters');
    const subcategory = dataFilters.attr('data-subc');
    const search = this.findIndex(documentGroup).search.toLowerCase();
    if (!subcategory && !search) return [];

    if (subcategory) {
      const indexWrapper = this.detailFilter[subcategory];
      const { sels: selectSearches, inps: textSearches, checkboxes: booleanSearches } = this.collectDetailSearch(dataFilters);
      const startIndex = Number(page) || 0;

      const result = await this.executeAdvancedFilter(search, indexWrapper, selectSearches, textSearches, booleanSearches, [], startIndex);
      this.setBGImage(result, documentGroup);
      return this.filterDuplications(result);
    } else {
      return await this.filterStuff(documentGroup, page);
    }
  }

  async findEquipmentItemDetailed(search, category, filterCompendium = true) {
    await this.buildDetailFilter('equipment', category);

    let indexWrapper = this.detailFilter[category];

    let result = await this.executeAdvancedFilter(search.search || '', indexWrapper, search.selects || [], search.inputs || [], search.booleans || [], search.rangeSearches || [], 0);
    if (filterCompendium) result = result.filter((x) => x.compendium != '');

    return await Promise.all(result.map((x) => fromUuid(x.uuid)));
  }

  filterDuplications(filteredItems) {
    if (game.settings.get('dsk', 'filterDuplicateItems'))
      filteredItems = [...new Map(filteredItems.map((item) => [`${item.name}_${item.type}`, item])).values()];

    return filteredItems;
  }

  async filterStuff(category, page) {
    const { index, itemType } = this.selectIndex(category);
    const search = index.search;
    const fields = this.systemConfiguration.getSearchFields(itemType, undefined, this.fullTextSearch);
    const collectTags = this.models[category]?.filter(x => x.selected).map(x => x.key) || [];
    const startIndex = Number(page) || 0;

    const searchParams = { ...fields, limit: (page || 0) + this.pageSize + 1 };
    if (collectTags.length > 0) {
      searchParams.tag = collectTags;
    }

    const searchResults = await this.flattenedResults(
      index,
      collectTags.length > 0 && search === "" ? "" : search,
      searchParams
    );

    const paginatedResults = searchResults.slice(
      startIndex,
      Math.min(startIndex + this.pageSize, searchResults.length)
    );

    index.next = startIndex + this.pageSize < searchResults.length ?
      startIndex + this.pageSize :
      undefined;

    const filteredItems = this.filterDuplications(
      paginatedResults.map(x => this._getStoredObject(index, x))
    );

    this.setBGImage(filteredItems, category);

    return filteredItems;
  }

  changeTab(tab, group, options) {
    super.changeTab(tab, group, options)

    switch (tab) {
      case "character":
      case "spell":
      case "equipment":
        this.buildItemIndex()
        break
      case "zoo":
        this.buildActorIndex()
        break
      case "journal":
        this.buildJournalEntryIndex()
        break
    }
  }

  setBGImage(filterdItems, category) {
    $(this.element).find(`[data-tab="${category}"] .libcontainer`)[`${filterdItems.length ? "remove" : "add"}Class`]("libraryImg")
  }

  async getItemTemplate(filteredItems, itemType) {
    const template = 'systems/dsk/templates/system/libraryItem.hbs'
    return await renderTemplate(template, { items: filteredItems })
  }

  async renderResult(filteredItems, category, isPaged) {
    const resultField = $(this.element).find(`[data-tab="${category}"] .searchResult .item-list`)
    const innerhtml = $(await this.getItemTemplate(filteredItems, category))

    if (!isPaged) resultField.html(innerhtml)
    else resultField.append(innerhtml)
  }

  async filterItems(documentGroup, page) {
    const filteredItems = this.advancedFiltering && documentGroup != "journal" ?
      await this.advancedFilterStuff(documentGroup, page) :
      await this.filterStuff(documentGroup, page);
    await this.renderResult(filteredItems, documentGroup, page);
    return filteredItems;
  }

  async buildEquipmentIndex() {
    await this.buildItemIndex()
  }

  async buildItemIndex() {
    await this._createIndex("Item", game.items)
  }

  async buildActorIndex() {
    await this._createIndex("Actor", game.actors)
  }

  async buildJournalEntryIndex() {
    await this._createIndex("JournalEntry", game.journal)
  }

  async _createIndex(documentName, worldItems) {
    const index = this.findIndex(documentName);
    if (index.build) return;

    index.build = true;
    index.store = {};
    index.buildToken = this.indexLoader?.bumpBuildToken?.() || (index.buildToken + 1);
    const progress = ui.notifications.info('dsk.Library.loading', { format: { item: "" }, progress: true });
    this.showLoading(documentName);

    const packs = game.packs.filter(p =>
      p.documentName === documentName &&
      (game.user.isGM || p.visible)
    );

    index.workerReady = false;
    if (!this.indexLoader?.enabled) {
      this.hideLoading(documentName);
      index.build = false;
      ui.notifications.error('DSK | ItemLibrary: Worker indexing unavailable');
      return;
    }

    const fields = this.systemConfiguration.getSearchFields(documentName, undefined, this.fullTextSearch).index;
    await this.indexLoader.reset({ documentName, token: index.buildToken });
    const ok = await this.indexLoader.ensureIndex({
      documentName,
      fields,
      fullTextSearch: this.fullTextSearch,
      token: index.buildToken
    });
    index.workerReady = !!ok;
    if (!index.workerReady) {
      this.hideLoading(documentName);
      index.build = false;
      ui.notifications.error('DSK | ItemLibrary: Worker indexing failed');
      return;
    }

    await this.indexWorldItems(worldItems, documentName);
    progress.update({
      message: 'dsk.Library.loading',
      format: { item: "world items" },
      pct: 0.1
    });

    const percentage = 0.9 / Math.max(packs.length, 1);
    let completedCount = 0;

    const getDocumentsFunction = documentName === "JournalEntry"
      ? p => p.getDocuments()
      : documentName === "Actor"
        ? p => p.getIndex({ fields: ["name", "img", "type"] })
        : p => p.getDocuments({ type__in: Object.keys(game.system.documentTypes.Item).filter(x => x != 'information') });

    await Promise.all(packs.map(async (p, i) => {
      if (i > 2) {
        await new Promise(resolve => setTimeout(resolve, 50 * (i % 3)));
      }

      const documents = await getDocumentsFunction(p);

      const batch = [];
      const BATCH_SIZE = 200;
      for (const item of documents) {
        const so = SearchDocument.toSearchableObject(item, documentName);
        index.store[so.uuid] = so;
        batch.push(so);

        if (batch.length >= BATCH_SIZE) {
          await this.indexLoader.addBatch({ documentName, batch, token: index.buildToken });
          batch.length = 0;
        }
      }

      if (batch.length) {
        await this.indexLoader.addBatch({ documentName, batch, token: index.buildToken });
      }

      completedCount++;
      progress.update({
        message: 'dsk.Library.loading',
        format: { item: `${p.metadata.label} (${p.metadata.id})` },
        pct: 0.1 + (completedCount * percentage)
      });
    }));

    progress.update({ message: 'dsk.Library.loading', format: { item: "" }, pct: 1 });

    this.hideLoading(documentName);
  }

  subcategoryFields(subcategory) {
    let field = ['name', 'type'];
    const attrs = ADVANCEDFILTERS[subcategory] || [];
    for (let attr of attrs) {
      field.push(attr.attr);
    }
    return field;
  }

  async indexWorldItems(worldItems, documentName) {
    if (game.settings.get('dsk', 'indexWorldItems')) {
      for (const item of worldItems.filter(x => x.visible)) {
        const wrapper = this.findIndex(documentName);
        const so = SearchDocument.toSearchableObject(item, documentName);
        wrapper.store[so.uuid] = so;
        if (wrapper.workerReady) await this.indexLoader.addBatch({ documentName, batch: [so], token: wrapper.buildToken });
      }
    }
    this.findIndex(documentName).worldBuild = true
  }

  selectIndex(category) {
    let itemType = 'Item';
    switch (category) {
      case 'Actor':
      case 'zoo':
        itemType = 'Actor';
        break;
      case 'JournalEntry':
      case 'journal':
        itemType = 'JournalEntry';
        break;
    }
    return { index: this.indexes[itemType], itemType };
  }

  async flattenedResults(index, search, args) {
    if (!this.indexLoader?.enabled || !index?.workerReady) return [];
    const token = index.buildToken;
    const res = await this.indexLoader.search({
      documentName: index.documentName,
      query: search,
      args,
      token
    });
    if (index.buildToken !== token) return [];
    return res;
  }

  _getStoredObject(indexWrapper, uuid) {
    return indexWrapper?.store?.[uuid];
  }

  async createDetailIndex(category, subcategory) {
    if (this.detailEnrichmentInFlight?.[subcategory]) return this.detailEnrichmentInFlight[subcategory];
    if (this.detailFilter[subcategory]) return;

    const promise = this._createDetailIndexInternal(category, subcategory);
    this.detailEnrichmentInFlight[subcategory] = promise;
    try {
      return await promise;
    } finally {
      delete this.detailEnrichmentInFlight[subcategory];
    }
  }

  async _createDetailIndexInternal(category, subcategory) {
    const { itemType } = this.selectIndex(category);
    if (itemType === 'Item') await this.buildItemIndex();
    else if (itemType === 'Actor') await this.buildActorIndex();

    this.detailStoreBySubcategory[subcategory] = this.detailStoreBySubcategory[subcategory] || {};

    const { index } = this.selectIndex(category);
    const catName = game.i18n.localize(`TYPES.${itemType}.${subcategory}`);
    const progress = ui.notifications.info('dsk.Library.loading', { format: { item: catName }, progress: true });
    const target = $(this.element).find(`*[data-tab="${category}"]`);

    target.find('.searchResult ul').html('');
    this.showLoading(target, category);

    this.detailFilter[subcategory] = {
      search: "",
      store: this.detailStoreBySubcategory[subcategory],
      candidates: [],
      next: undefined
    };

    // Fill world items directly (cheap) and cache.
    if (game.settings.get('dsk', 'indexWorldItems')) {
      const worldStuff = itemType === 'Item' ? game.items : game.actors;
      for (const doc of worldStuff.filter(x => x.visible && x.type === subcategory)) {
        const enriched = AdvancedSearchDocument.toSearchableObject(doc, subcategory);
        this.detailStoreBySubcategory[subcategory][enriched.uuid] = enriched;
      }
    }

    progress.update({ message: 'dsk.Library.loading', format: { item: catName }, pct: 0.1 });
    const uuids = await this.flattenedResults(index, '', { tag: [subcategory], limit: this.filterLimit });
    this.candidateUuidsBySubcategory[subcategory] = uuids;
    this.detailFilter[subcategory].candidates = uuids;

    const BATCH_SIZE = 25;
    const compendiumUuids = uuids.filter(uuid => uuid.startsWith('Compendium'));
    const totalBatches = Math.ceil(compendiumUuids.length / BATCH_SIZE);

    for (let i = 0; i < totalBatches; i++) {
      const batchUuids = compendiumUuids.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
      const missingUuids = batchUuids.filter(uuid => !this.detailStoreBySubcategory[subcategory][uuid]);
      const batchItems = await Promise.all(missingUuids.map(uuid => fromUuid(uuid)));

      for (const item of batchItems.filter(Boolean)) {
        const enriched = AdvancedSearchDocument.toSearchableObject(item, subcategory);
        this.detailStoreBySubcategory[subcategory][enriched.uuid] = enriched;
      }

      const progressPct = Math.min(0.1 + 0.8 * ((i + 1) / totalBatches), 0.9);
      progress.update({
        message: 'dsk.Library.loading',
        format: { item: `${catName} (${Math.min((i + 1) * BATCH_SIZE, compendiumUuids.length)}/${compendiumUuids.length})` },
        pct: progressPct
      });

      if (i < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    this.hideLoading(target, category);
    progress.update({ message: 'dsk.Library.loading', format: { item: catName }, pct: 1 });
  }

  async buildDetailFilter(category, subcategory, savedSettings = undefined) {
    if (category === 'none') {
      return `<p>${game.i18n.localize('dsk.Library.selectAdvanced')}</p>`;
    }

    const indexPromise = this.createDetailIndex(category, subcategory);
    const fields = duplicate(ADVANCEDFILTERS[subcategory] || []);

    if (savedSettings) {
      const settingsMap = {
        'select': savedSettings.selects,
        'text': savedSettings.inputs,
        'checkbox': savedSettings.booleans
      };

      for (const field of fields) {
        const settingsArray = settingsMap[field.type];
        if (settingsArray) {
          const setting = settingsArray.find(x => x[0] === field.attr);
          if (setting) field.value = setting[1];
        }
      }
    }

    const template = await renderTemplate(
      'systems/dsk/templates/system/detailFilter.hbs',
      { fields, subcategory }
    );
    await indexPromise;
    return template;
  }

  itemDragStart(ev) {
    ev.stopPropagation()
    $(this.element).animate({ opacity: 0.2 }, 100);
    const uuid = ev.target.dataset.uuid
    const { type } = foundry.utils.parseUuid(uuid);
    ev.dataTransfer.setData("text/plain", JSON.stringify({ type, uuid, dragSource: "itemlibrary" }));
    ev.target.addEventListener("dragend", () => {
      window.setTimeout(() => $(this.element).animate({ opacity: 1 }, 300, () => $(this.element).css({ pointerEvents: "" })))
    }, { once: true });
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    const html = $(this.element)
    const source = this
    html.find('.filterCategories .filter').on('change', ev => this.filterChanged(ev))
    html.find('.changeSettings').on('click', (ev) => this.onChangeSetting(ev))
    html.find(".filterBy-search").on('keyup', ev => this._onFilterBySearch(ev))
    html.on("mousedown", ".searchResult .browser-item", ev => this._onItemNameClick(ev))
    html.on("mouseenter", ".searchResult .browser-item", ev => this._onItemHover(ev))
    html.on('click', ".searchResult .browser-item", ev => this._openItem(ev))
    this.element.addEventListener("dragstart", this.itemDragStart.bind(this));
    html.find('.scrollable, .window-content').on('scroll.infinit', ev => foundry.utils.debounce(this._infiniteScroll(ev, source), 100));
    this.element.addEventListener("dragover", ev => this._onDragOver(ev));
    
    html.on('change', '.detailFilters input, .detailFilters select', () => {
      const category = $(this.element).find('.tab.active')[0].dataset.tab;

      if (this.advancedFiltering) {
        const dataFilters = $(this.element).find('.detailFilters');
        const subcategory = dataFilters.attr('data-subc');
        if (subcategory && this.detailFilter[subcategory]) {
          this.detailFilter[subcategory].next = undefined;
        }
      }

      this._debouncedFilterItems(category);
    });

    // Wait for initialization before building index
    await this._initPromise;
    this.buildItemIndex()
  }

  async _openItem(ev) {
    const uuid = $(ev.currentTarget).data("uuid")
    const item = await fromUuid(uuid)
    if (!item) {
      ui.notifications.warn(game.i18n.localize("dsk.DSKError.notFound"))
      return
    }
    item.sheet.render(true)
  }

  async _onItemHover(ev) {
    const uuid = ev.currentTarget.dataset.uuid;
    const item = await fromUuid(uuid);

    if (item.documentName == "JournalEntry") return

    let tooltip = await item.toEmbed?.({}, { skipHeader: true })

    if (!tooltip) tooltip = await this.systemConfiguration.renderTooltip(item)

    game.tooltip.activate(ev.currentTarget, {
      html: tooltip,
      cssClass: 'itemLibraryTooltip',
    })
  }

  _infiniteScroll(ev, source) {
    const log = $(ev.target);
    const pct = (log.scrollTop() + log.innerHeight()) >= log[0].scrollHeight - 100;

    if (!pct) return;

    const category = $(this.element).find('.tab.active')[0].dataset.tab;

    if (source.advancedFiltering) {
      const dataFilters = $(source.element).find('.detailFilters');
      const subcategory = dataFilters.attr('data-subc');

      if (subcategory && source.detailFilter[subcategory]?.next) {
        source.filterItems.call(source, category, source.detailFilter[subcategory].next);
      } else {
        const documentName = source.systemConfiguration.documentNameFromGroup(category);
        if (source.indexes[documentName]?.next) {
          source.filterItems.call(source, category, source.indexes[documentName].next);
        }
      }
    } else {
      const documentName = source.systemConfiguration.documentNameFromGroup(category);
      if (source.indexes[documentName]?.next) {
        source.filterItems.call(source, category, source.indexes[documentName].next);
      }
    }
  }

  async _onItemNameClick(ev) {
    const uuid = ev.currentTarget.dataset.uuid
    const item = await fromUuid(uuid)
    if (ev.button == 2) DSKUtility.showArtwork(item)
  }

  findIndex(category) {
    return this.selectIndex(category).index
  }

  _onFilterBySearch(ev) {
    const category = $(this.element).find('.tab.active')[0].dataset.tab
    this.findIndex(category).search = ev.currentTarget.value

    if (this.advancedFiltering) {
      const dataFilters = $(this.element).find('.detailFilters');
      const subcategory = dataFilters.attr('data-subc');
      if (subcategory && this.detailFilter[subcategory]) {
        this.detailFilter[subcategory].next = undefined;
      }
    }

    this._debouncedFilterItems(category);
  }

  async filterChanged(ev) {
    const { category, type } = ev.currentTarget.dataset;
    const tab = $(ev.currentTarget).closest('.tab').data('tab');
    const isChecked = ev.currentTarget.checked;

    const model = this.models[tab]?.find(x => x.key === type);
    if (model) {
      model.selected = isChecked;
    }

    if (this.advancedFiltering) {
      const dataFilters = $(this.element).find('.detailFilters');
      const subcategory = dataFilters.attr('data-subc');
      if (subcategory && this.detailFilter[subcategory]) {
        this.detailFilter[subcategory].next = undefined;
      }

      await this.setAdvancedFilters(category, type);
      if (isChecked) {
        const template = await this.buildDetailFilter(category, type);
        $(this.element).find('.tab.active .advancedSearch .groupbox').html(template);
        ev.currentTarget.checked = isChecked;
      }
    }

    await this.filterItems(tab);
  }

  _tearDown(options) {
    super._tearDown(options);
    for (let key in this.indexes) {
      if (this.indexes[key].observer) {
        this.indexes[key].observer.disconnect();
        this.indexes[key].observer = undefined;
      }
    }
    for (let key in this.detailFilter) {
      if (this.detailFilter[key].observer) {
        this.detailFilter[key].observer.disconnect();
        this.detailFilter[key].observer = undefined;
      }
    }
  }

  _onDragOver(ev) {
    if (ev.dataTransfer?.types.includes("dragSource"))
      $(this.element).css({ pointerEvents: "none" });
  }

  /**
   * Show an index-building spinner.
   * @param {string|JQuery|HTMLElement} targetOrCategory
   * @param {string} [category]
   */
  showLoading(targetOrCategory, category) {
    if (!this.element) return;

    const hasTarget = targetOrCategory && typeof targetOrCategory === 'object' && (targetOrCategory instanceof HTMLElement || targetOrCategory.jquery);
    const target = hasTarget ? $(targetOrCategory) : $(this.element);
    const effectiveCategory = hasTarget ? category : targetOrCategory;

    try {
      if (typeof effectiveCategory === 'string') this.setBGImage([1], effectiveCategory);
      const loading = $(`<div class="loader"><i class="fa fa-4x fa-spinner fa-spin"></i>${game.i18n.localize('dsk.Library.buildingIndex')}</div>`);
      loading.appendTo(target.find('.searchResult'));
    } catch (e) {
    }
  }

  /**
   * Hide the index-building spinner.
   * @param {string|JQuery|HTMLElement} targetOrCategory
   * @param {string} [category]
   */
  hideLoading(targetOrCategory, category) {
    if (!this.element) return;

    const hasTarget = targetOrCategory && typeof targetOrCategory === 'object' && (targetOrCategory instanceof HTMLElement || targetOrCategory.jquery);
    const target = hasTarget ? $(targetOrCategory) : $(this.element);
    const effectiveCategory = hasTarget ? category : targetOrCategory;

    try {
      if (typeof effectiveCategory === 'string') this.setBGImage([], effectiveCategory);
      target.find('.loader').remove();
    } catch (e) {
    }
  }

  // Static action handlers
  static _toggleAdvancedMode(ev, target) {
    this.advancedFiltering = !this.advancedFiltering
    if (this.advancedFiltering) {
      $(this.element).find('.toggleAdvancedMode').addClass("on")
      $(this.element).find('.advancedSearch').fadeIn()
      this.setAdvancedFilters()
    } else {
      $(this.element).find('.toggleAdvancedMode').removeClass("on")
      $(this.element).find('.advancedSearch').fadeOut()
    }
  }

  static _toggleWorldIndex(ev, target) {
    game.settings.set("dsk", "indexWorldItems", !game.settings.get("dsk", "indexWorldItems"))
    $(target).toggleClass("on")
  }

  static _fulltextsearch(ev, target) {
    game.settings.set("dsk", "indexDescription", !game.settings.get("dsk", "indexDescription"))
    $(target).toggleClass("on")
  }

  static async _filterChange(ev, target) {
    const tab = $(this.element).find('.tab.active')
    const category = tab.attr("data-tab")
    this.filterItems(category);
  }

  static async _filterItem(ev, target) {
    const tab = $(target).closest('.tab')
    const category = tab.attr("data-tab")
    const subcategory = $(target).attr("data-category")
    const isChecked = $(target).is(":checked")
    if (this.advancedFiltering && isChecked) {
      this.setAdvancedFilters()
      this.subcategory = subcategory
      $(target).prop("checked", isChecked)
      $(this.element).find('.advancedSearch .groupbox').html(await this.buildDetailFilter(category, subcategory))
    }
    const model = this.models[category]?.find(x => x.key === subcategory);
    if (model) model.selected = isChecked;
    this.filterItems(category);
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

  static _tabClick(ev, target) {
    const tabName = target.dataset.tab
    if (tabName === "journal") {
      this.buildJournalEntryIndex()
    } else if (tabName === "zoo") {
      this.buildActorIndex()
    }
  }
}
