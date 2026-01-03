import { DSKDataModel } from '../../abstract.js';

const { SchemaField, HTMLField } = foundry.data.fields;

/**
 * Template for item descriptions
 */
export default class DescriptionTemplate extends DSKDataModel {
  static defineSchema() {
    return {
      description: new SchemaField({
        value: new HTMLField({ initial: '', label: 'dsk.description' }),
        gminfo: new HTMLField({ initial: '', label: 'dsk.gminfo' }),
      }),
    };
  }
}
