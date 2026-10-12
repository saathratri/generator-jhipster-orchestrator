/*
 * Copyright (c) 2025-2026 Saathratri, LLC.
 * SPDX-License-Identifier: MIT
 * Licensed under the MIT License; see LICENSE in the repository root.
 */

/**
 * `@sensitive` / `@sensitive(writeOnly)` field annotations.
 *
 * - `@sensitive`: the value is never printed (entity and DTO `toString` say `set` / `missing`, so no generated log line
 *   carries it), it cannot be filtered on, and the generated screens mask it behind a show / hide / copy control.
 * - `@sensitive(writeOnly)`: all of the above, and the value is never returned by the REST API - it is accepted on
 *   create and update, the DTO reports only `<field>IsSet`, and an update that leaves it empty keeps the stored value.
 *
 * The JDL hands the annotation over as `field.options.sensitive` (`true` or `'writeOnly'`). Anything the generator
 * cannot keep secret is refused at generation time rather than generated half-safe.
 */

export const SENSITIVE_WRITE_ONLY = 'writeOnly';

// A TextBlob reaches the field preparation as fieldType byte[] with blob content type 'text'.
const isTextField = field =>
  ['String', 'TextBlob'].includes(field.fieldType) || field.fieldTypeBlobContent === 'text' || field.blobContentTypeText === true;

/**
 * Sets `field.fieldSensitive` / `field.fieldWriteOnly` from the field's annotation. Idempotent; throws when the
 * annotation cannot be honoured.
 */
export function prepareSensitiveField({ application, entity, field }) {
  const value = field.options?.sensitive;
  if (value === undefined || value === false || value === null) {
    field.fieldSensitive = false;
    field.fieldWriteOnly = false;
    return;
  }
  const where = `${entity.name}.${field.fieldName}`;
  if (value !== true && value !== SENSITIVE_WRITE_ONLY) {
    throw new Error(`${where}: @sensitive("${value}") is not supported - use @sensitive or @sensitive(${SENSITIVE_WRITE_ONLY}).`);
  }
  if (field.id) {
    throw new Error(`${where}: a primary key cannot be @sensitive.`);
  }
  if (!isTextField(field)) {
    throw new Error(`${where}: @sensitive applies to a String or TextBlob field, not ${field.fieldType}.`);
  }
  if ((field.options?.customAnnotation ?? []).includes('DISPLAY_IN_GUI_RELATIONSHIP_LINK')) {
    throw new Error(
      `${where}: a @sensitive field cannot carry DISPLAY_IN_GUI_RELATIONSHIP_LINK - a relationship link's label would show its value.`,
    );
  }
  if ((field.options?.customAnnotation ?? []).includes('VECTOR')) {
    throw new Error(`${where}: a VECTOR field cannot be @sensitive.`);
  }
  field.fieldSensitive = true;
  field.fieldWriteOnly = value === SENSITIVE_WRITE_ONLY;
  if (!field.fieldWriteOnly) {
    return;
  }
  if ((field.fieldValidateRules ?? []).includes('required')) {
    throw new Error(`${where}: a write-only field (@sensitive(${SENSITIVE_WRITE_ONLY})) cannot be required - an update never carries it.`);
  }
  if (entity.dto !== 'mapstruct') {
    throw new Error(
      `${where}: a write-only field (@sensitive(${SENSITIVE_WRITE_ONLY})) needs dto mapstruct on its entity - the DTO is what keeps it out of responses.`,
    );
  }
  if (application?.reactive) {
    throw new Error(`${where}: write-only fields (@sensitive(${SENSITIVE_WRITE_ONLY})) are not supported on a reactive application yet.`);
  }
}

/** The entity's sensitive fields (both forms), in declaration order. */
export const sensitiveFieldsOf = entity => (entity.fields ?? []).filter(field => field.fieldSensitive);

/** The entity's write-only fields, in declaration order. */
export const writeOnlyFieldsOf = entity => (entity.fields ?? []).filter(field => field.fieldWriteOnly);

/**
 * The `toString` fragment base JHipster writes for a non-numeric field (`", name='" + getName() + "'" +`) and the one a
 * sensitive field gets instead (`", name=" + (getName() == null ? "missing" : "set") +`).
 */
export function maskToStringFragment(content, field) {
  const getter = `${field.propertySupplierName ?? `get${field.fieldNameCapitalized}`}()`;
  const plain = new RegExp(`", ${field.fieldName}='" \\+ ${escapeRegExp(getter)} \\+ "'" \\+`, 'g');
  return content.replace(plain, `", ${field.fieldName}=" + (${getter} == null ? "missing" : "set") +`);
}

const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
