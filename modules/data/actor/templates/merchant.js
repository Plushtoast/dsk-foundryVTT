import DSK from '../../../system/config.js';
import { DSKDataModel } from '../../abstract.js';
import DSKBooleanField from '../../fields/dsk_boolean_field.js';

const { SchemaField, NumberField, StringField, ObjectField, BooleanField } = foundry.data.fields;

/**
 * Template for merchant functionality on actors
 * Enables actors to function as merchants, loot containers, or epic item displays
 */
export default class MerchantTemplate extends DSKDataModel {
  static defineSchema() {
    return {
      merchant: new SchemaField({
        locked: new BooleanField({ initial: false, label: 'dsk.MERCHANT.locked' }),
        merchantType: new StringField({ 
          initial: 'none', 
          required: true, 
          choices: DSK.merchantTypes, 
          label: 'dsk.MERCHANT.type' 
        }),
        temporary: new DSKBooleanField({ initial: false, label: 'dsk.MERCHANT.temporary' }),
        sellingFactor: new NumberField({ initial: 1, step: 0.01, min: 0, label: 'dsk.MERCHANT.sellingFactor' }),
        buyingFactor: new NumberField({ initial: 1, step: 0.01, min: 0, label: 'dsk.MERCHANT.buyingFactor' }),
        playerView: new DSKBooleanField({ initial: false, label: 'dsk.MERCHANT.playerView' }),
        factors: new SchemaField({
          buyingFactor: new ObjectField(),
          sellingFactor: new ObjectField(),
        }),
      }),
    };
  }
}
