const { NumberField } = foundry.data.fields;

/**
 * A number field that clamps to minimum value
 */
export default class DSKNumberField extends NumberField {
  _cast(value) {
    const num = super._cast(value);
    if (this.min !== undefined && num < this.min) {
      return this.min;
    }
    return num;
  }

  _validateType(value) {
    if (typeof value !== 'number' || isNaN(value)) {
      return new foundry.data.validation.DataModelValidationFailure({
        invalidValue: value,
        message: `Value "${value}" is not a valid number`,
      });
    }
  }
}
