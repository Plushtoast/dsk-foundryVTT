import { DSKDataModel } from '../../abstract.js';
import DSKNumberField from '../../fields/dsk_number_field.js';

const { SchemaField, NumberField, StringField, BooleanField } = foundry.data.fields;

/**
 * Template for actor status (derived stats like LeP, AeP, SK, ZK, etc.)
 */
export default class StatusTemplate extends DSKDataModel {
  static defineSchema() {
    return {
      stats: new SchemaField({
        LeP: new SchemaField({
          initial: new NumberField({ initial: 0 }),
          advances: new NumberField({ initial: 0 }),
          value: new DSKNumberField({ initial: 0 }),
          modifier: new NumberField({ initial: 0 }),
        }),
        AeP: new SchemaField({
          initial: new NumberField({ initial: 0 }),
          advances: new NumberField({ initial: 0 }),
          value: new DSKNumberField({ initial: 0 }),
          modifier: new NumberField({ initial: 0 }),
        }),
        sk: new SchemaField({
          initial: new NumberField({ initial: 0 }),
          advances: new NumberField({ initial: 0 }),
          modifier: new NumberField({ initial: 0 }),
          value: new NumberField({ initial: 0 }),
        }),
        zk: new SchemaField({
          initial: new NumberField({ initial: 0 }),
          advances: new NumberField({ initial: 0 }),
          modifier: new NumberField({ initial: 0 }),
          value: new NumberField({ initial: 0 }),
        }),
        schips: new SchemaField({
          initial: new NumberField({ initial: 0 }),
          modifier: new NumberField({ initial: 0 }),
          current: new NumberField({ initial: 0 }),
          value: new NumberField({ initial: 0 }),
        }),
        gs: new SchemaField({
          initial: new NumberField({ initial: 0 }),
          modifier: new NumberField({ initial: 0 }),
        }),
        ini: new SchemaField({
          current: new NumberField({ initial: 0 }),
          initial: new NumberField({ initial: 0 }),
          modifier: new NumberField({ initial: 0 }),
          die: new StringField({ initial: '1d6' }),
          value: new NumberField({ initial: 0 }),
        }),
        regeneration: new SchemaField({
          LePTemp: new DSKNumberField({ initial: 0 }),
          AePTemp: new DSKNumberField({ initial: 0 }),
          LePMod: new DSKNumberField({ initial: 0 }),
          AePMod: new DSKNumberField({ initial: 0 }),
        }),
      }),
      details: new SchemaField({
        species: new StringField({ initial: '' }),
        size: new StringField({ initial: 'average' }),
      }),
      config: new SchemaField({
        autoBar: new BooleanField({ initial: true }),
        autoSize: new BooleanField({ initial: true }),
      }),
      money: new NumberField({ initial: 0 }),
    };
  }
}
