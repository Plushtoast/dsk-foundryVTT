import { DSKDataModel } from './abstract.js';
const { renderTemplate } = foundry.applications.handlebars;

/**
 * Base DataModel class for all DSK items
 * Provides common functionality for item data handling
 */
export class ItemDataModel extends DSKDataModel {
  /**
   * Prepare data for the item sheet
   * @async
   * @param {Object} data - The data to prepare
   * @returns {Promise<Object>} The prepared sheet data
   */
  async getSheetData(data) {
    return data;
  }

  /**
   * Get the associated actor if any
   * @returns {Actor|null} The parent actor or null
   */
  get actor() {
    return this.parent?.actor || null;
  }

  /**
   * Get a copy of the item with overrides applied
   * @returns {Object} The item with overrides applied
   */
  itemWithOverrides() {
    const object = this.parent.toObject();
    const overrides = foundry.utils.flattenObject(this.parent.overrides || {});
    foundry.utils.mergeObject(object, overrides);
    return object;
  }

  /**
   * Prepare the item for display in an embedded sheet (actor sheet)
   * @returns {Object} The prepared item data
   */
  prepareEmbeddedItemSheet() {
    return this.itemWithOverrides();
  }

  /**
   * Prepare item structure information
   * @param {Object} item - The item to prepare
   * @returns {Object} The prepared item
   */
  static _prepareItemStructure(item) {
    // Handle enchantment classes
    const enchants = foundry.utils.getProperty(item, 'flags.dsk.enchantments');
    if (enchants && enchants.length > 0) {
      item.enchantClass = 'rar';
    } else if (item.effects?.length > 0) {
      item.enchantClass = 'common';
    }
    return item;
  }

  /**
   * Set onUseEffect flag for display
   * @param {Object} item - The item to check
   */
  _setOnUseEffect(item) {
    if (foundry.utils.getProperty(item, 'flags.dsk.onUseEffect')) {
      item.onUseEffect = true;
    }
  }

  /**
   * Helper function to format a chat line
   * @param {Object} options - Line data options
   * @param {string} options.key - The key to be localized
   * @param {string} options.val - The value to display
   * @param {boolean} [options.localizeVal=false] - Whether to localize the value
   * @returns {string} Formatted HTML line
   */
  static _chatLineHelper({ key, val, localizeVal = false }) {
    const displayValue = localizeVal ? _loc(val) : val;
    return `<b>${_loc(key)}</b>: ${displayValue || '-'}`;
  }

  /**
   * Get chat data for the item
   * @param {Object} data - The item data
   * @param {string} name - The item name
   * @returns {Array} Array of chat data objects
   */
  static chatData(data, name) {
    return [];
  }

  /**
   * Post item data to chat
   * @async
   * @param {Item} item - The item to post
   * @returns {Promise<ChatMessage>} The created chat message
   */
  static async _postItem(item) {
    const chatData = foundry.utils.duplicate(item);
    const properties = this.chatData(chatData.system, item.name).map(x => this._chatLineHelper(x));

    const html = await renderTemplate('systems/dsk/templates/chat/post-item.hbs', {
      item,
      properties,
    });

    const chatMessage = {
      user: game.user.id,
      content: html,
      speaker: ChatMessage.getSpeaker(),
    };

    return ChatMessage.create(chatMessage);
  }  

  static buildReloadProgress(item) {
    const progress = item.system.reloadTimeprogress / item.LZ;
    item.title = _loc("dsk.WEAPON.loading", {
      status: `${item.system.reloadTimeprogress}/${item.LZ}`,
    });
    item.progress = `${item.system.reloadTimeprogress}/${item.LZ}`;
    if (progress >= 1) {
      item.title = _loc("dsk.WEAPON.loaded");
    }
    this.progressTransformation(item, progress);
  }

  static progressTransformation(item, progress) {
    if (progress >= 0.5) {
      item.transformRight = "181deg";
      item.transformLeft = `${Math.round(progress * 360 - 179)}deg`;
    } else {
      item.transformRight = `${Math.round(progress * 360 + 1)}deg`;
      item.transformLeft = 0;
    }
  }
}
