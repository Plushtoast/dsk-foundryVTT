const { StringField } = foundry.data.fields;

/**
 * A string field that trims whitespace
 */
export default class DSKStringField extends StringField {
  _cast(value) {
    const str = super._cast(value);
    return str?.trim() ?? '';
  }
}
