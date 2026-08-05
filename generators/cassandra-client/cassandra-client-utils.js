export const languagesSaathratriUtils = {
  getCompositePrimaryKeyConfirmDelete(primaryKey) {
    const fields = primaryKey.ids.map(field => `${field.fieldNameHumanized} '{{ ${field.fieldName} }}'`);

    if (fields.length > 1) {
      return `${fields.slice(0, -1).join(', ')}, and ${fields[fields.length - 1]}`;
    }
    return fields[0];
  },
};
