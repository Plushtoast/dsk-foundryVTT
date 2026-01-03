import { DSKDataModel } from '../../abstract.js';
import DSKNumberField from '../../fields/dsk_number_field.js';
import DSK from '../../../system/config.js';

const { SchemaField, NumberField, StringField, BooleanField } = foundry.data.fields;

/**
 * Template for actor status (derived stats like LeP, AeP, SK, ZK, etc.)
 */
export default class StatusTemplate extends DSKDataModel {
  static defineSchema() {
    return {
      stats: new SchemaField({
        LeP: new SchemaField({
          initial: new NumberField({ initial: 0, label: 'dsk.Initial' }),
          advances: new NumberField({ initial: 0, label: 'dsk.Advances' }),
          value: new DSKNumberField({ initial: 0, label: 'dsk.value' }),
          modifier: new NumberField({ initial: 0, label: 'dsk.Modifiers' }),
        }, { label: 'dsk.LeP' }),
        AeP: new SchemaField({
          initial: new NumberField({ initial: 0, label: 'dsk.Initial' }),
          advances: new NumberField({ initial: 0, label: 'dsk.Advances' }),
          value: new DSKNumberField({ initial: 0, label: 'dsk.value' }),
          modifier: new NumberField({ initial: 0, label: 'dsk.Modifiers' }),
        }, { label: 'dsk.AeP' }),
        sk: new SchemaField({
          initial: new NumberField({ initial: 0, label: 'dsk.Initial' }),
          advances: new NumberField({ initial: 0, label: 'dsk.Advances' }),
          modifier: new NumberField({ initial: 0, label: 'dsk.Modifiers' }),
          value: new NumberField({ initial: 0, label: 'dsk.value' }),
        }, { label: 'dsk.soulpower' }),
        zk: new SchemaField({
          initial: new NumberField({ initial: 0, label: 'dsk.Initial' }),
          advances: new NumberField({ initial: 0, label: 'dsk.Advances' }),
          modifier: new NumberField({ initial: 0, label: 'dsk.Modifiers' }),
          value: new NumberField({ initial: 0, label: 'dsk.value' }),
        }, { label: 'dsk.toughness' }),
        schips: new SchemaField({
          initial: new NumberField({ initial: 0, label: 'dsk.Initial' }),
          modifier: new NumberField({ initial: 0, label: 'dsk.Modifiers' }),
          current: new NumberField({ initial: 0, label: 'dsk.current' }),
          value: new NumberField({ initial: 0, label: 'dsk.value' }),
        }, { label: 'dsk.fatePoints' }),
        gs: new SchemaField({
          initial: new NumberField({ initial: 0, label: 'dsk.Initial' }),
          modifier: new NumberField({ initial: 0, label: 'dsk.Modifiers' }),
        }, { label: 'dsk.speed' }),
        ini: new SchemaField({
          current: new NumberField({ initial: 0, label: 'dsk.current' }),
          initial: new NumberField({ initial: 0, label: 'dsk.Initial' }),
          modifier: new NumberField({ initial: 0, label: 'dsk.Modifiers' }),
          die: new StringField({ initial: '1d6', label: 'dsk.ROLL.initDie' }),
          value: new NumberField({ initial: 0, label: 'dsk.value' }),
        }, { label: 'dsk.COMBATMODIFIER.INI' }),
        regeneration: new SchemaField({
          LePTemp: new DSKNumberField({ initial: 0, label: 'dsk.SHEET.tempRegeneration' }),
          AePTemp: new DSKNumberField({ initial: 0, label: 'dsk.SHEET.tempRegeneration' }),
          LePMod: new DSKNumberField({ initial: 0, label: 'dsk.SHEET.permRegeneration' }),
          AePMod: new DSKNumberField({ initial: 0, label: 'dsk.SHEET.permRegeneration' }),
        }, { label: 'dsk.regenerate' }),
      }),
      details: new SchemaField({
        species: new StringField({ initial: '', label: 'TYPES.Item.species' }),
        size: new StringField({ 
          initial: 'average',
          choices: DSK.sizeCategories,
          label: 'dsk.size' 
        }),
      }),
      config: new SchemaField({
        autoBar: new BooleanField({ initial: true, label: 'dsk.SHEET.autoBar' }),
        autoSize: new BooleanField({ initial: true, label: 'dsk.SHEET.autoSize' }),
      }),
      money: new NumberField({ initial: 0, label: 'dsk.money' }),
    };
  }
}
