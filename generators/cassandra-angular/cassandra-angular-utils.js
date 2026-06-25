export const angularSaathratriUtils = {
  /**************************************
   * cassandra-angular Helper Functions
   **************************************/

  /**
   * @private
   * Generate Entity Client Field Declarations
   *
   * @param {string} primaryKey - primary key definition
   * @param {Array|Object} fields - array of fields
   * @param {string} fileType - file type
   * @returns variablesWithTypes: Array
   */
  generateEntityClientFieldsSaathratri(fields, fileType) {
    const variablesWithTypes = [];

    fields.forEach(field => {
      const { fieldName } = field;

      let tsType = this.getTypescriptType(field);

      if (fileType === 'Model') {
        const nullable = !field.isCompositePrimaryKeyField && field.nullable;

        if (nullable) {
          tsType += ' | null';
        }

        variablesWithTypes.push(`${fieldName}?: ${tsType}`);
      } else if (fileType === 'Service') {
        if (field.isCompositePrimaryKeyField) {
          variablesWithTypes.push(`${fieldName}: ${tsType}`);
        }
      }
    });

    return variablesWithTypes;
  },

  getTypescriptType(field) {
    let tsType = 'any';
    const { fieldType } = field;

    if (field.fieldIsEnum) {
      tsType = `keyof typeof ${fieldType}`;
    } else if (fieldType === 'Boolean') {
      tsType = 'boolean';
    } else if (['Integer', 'Long', 'Float', 'Double', 'BigDecimal'].includes(fieldType)) {
      tsType = 'number';
    } else if (['String', 'UUID', 'Duration'].includes(fieldType)) {
      tsType = 'string';
    } else if (['LocalDate', 'Instant', 'ZonedDateTime'].includes(fieldType)) {
      tsType = 'dayjs.Dayjs';
    }

    return tsType;
  },

  /**
   * Generate Entity Client Field Default Values
   *
   * @param {Array|Object} fields - array of fields
   * @returns {Array} defaultVariablesValues
   */
  getCompositePrimaryKeyClientModelGenerateEntityClientFieldDefaultValues(fields) {
    const defaultVariablesValues = {};
    fields.forEach(field => {
      const { fieldType } = field;
      const { fieldName } = field;
      if (field.isCompositePrimaryKeyClientField && fieldType === 'Boolean') {
        defaultVariablesValues[fieldName] = `this.${fieldName} = this.${fieldName} ?? false;`;
      }
    });
    return defaultVariablesValues;
  },

  getCompositePrimaryKeyClientDelete(entityInstanceName, primaryKey) {
    return primaryKey.ids
      .map(pk =>
        pk.fieldContainsUtc || pk.fieldContainsUtcSaathratri
          ? `${pk.fieldName}: ${entityInstanceName}.${primaryKey.name}.${pk.fieldName}  | convertFromDayjsToDateLong`
          : `${pk.fieldName}: ${entityInstanceName}.${primaryKey.name}.${pk.fieldName}`,
      )
      .join(',\n');
  },

  getCompositePrimaryKeyClientRouterLink(entityInstanceName, primaryKey) {
    return primaryKey.ids
      .map(pk =>
        pk.fieldContainsUtc || pk.fieldContainsUtcSaathratri
          ? `${entityInstanceName}()!.${primaryKey.name}.${pk.fieldName} | convertFromDayjsToDateLong`
          : `${entityInstanceName}()!.${primaryKey.name}.${pk.fieldName}`,
      )
      .join(',\n');
  },

  getCompositePrimaryKeyClientListRouterLink(entityInstanceName, primaryKey) {
    return primaryKey.ids
      .map(pk =>
        pk.fieldContainsUtc || pk.fieldContainsUtcSaathratri
          ? `${entityInstanceName}!.${primaryKey.name}.${pk.fieldName} | convertFromDayjsToDateLong`
          : `${entityInstanceName}!.${primaryKey.name}.${pk.fieldName}`,
      )
      .join(',\n');
  },

  getCompositePrimaryKeyClientDataParameters(primaryKey) {
    return primaryKey.ids.map(pk => pk.fieldName).join(', ');
  },

  getCompositePrimaryKeyClientRouteUrlParameters(primaryKey) {
    return primaryKey.ids.map(pk => `:${pk.fieldName}`).join('/');
  },

  getCompositePrimaryKeyClientServiceUrl(entityInstanceName, primaryKey) {
    return primaryKey.ids
      .map(pk =>
        pk.fieldTypeTimed || pk.fieldContainsUtc || pk.fieldTypeTimedSaathratri || pk.fieldContainsUtcSaathratri
          ? `\${copy.${primaryKey.name}.${pk.fieldName}}`
          : `\${${entityInstanceName}.${primaryKey.name}.${pk.fieldName}}`,
      )
      .join('/');
  },

  getCompositePrimaryKeyClientUpdateComponentUndefinedCheck(entityInstanceName, primaryKey) {
    return primaryKey.ids.map(pk => `${entityInstanceName}.${primaryKey.name}?.${pk.fieldName} !== undefined`).join(' && \n');
  },

  getCompositePrimaryKeyClientServiceModelPrimaryKeyVariableDeclarationStatements(primaryKey, fields, variablesWithTypes) {
    if (!primaryKey || !fields || !variablesWithTypes) {
      return [];
    }

    const variableDeclarations = [];
    const primaryKeyFieldNames = primaryKey.ids.map(pk => pk.fieldName);

    fields.forEach(field => {
      if (primaryKeyFieldNames.includes(field.fieldName)) {
        if (field.options) {
          if (field.fieldTypeLocalDateSaathratri || field.fieldTypeTimedSaathratri) {
            variableDeclarations.push(`${field.fieldName}: dayjs.Dayjs | null`);
          } else {
            variableDeclarations.push(`${field.fieldName}: ${this.getTypescriptType(field)} | null`);
          }
        }
      }
    });

    return variableDeclarations;
  },

  getCompositePrimaryKeyClientServiceModelNonPrimaryKeyVariableDeclarationStatements(primaryKey, fields, variablesWithTypes) {
    if (!primaryKey || !fields || !variablesWithTypes) {
      return [];
    }

    const variableDeclarations = [];
    const primaryKeyFieldNames = primaryKey.ids.map(pk => pk.fieldName);

    fields.forEach(field => {
      // Skip vector embedding fields from Angular model
      if (field.fieldTypeVectorSaathratri) return;
      if (!primaryKeyFieldNames.includes(field.fieldName)) {
        if (field.options) {
          if (field.fieldTypeMapDayjsSaathratri) {
            variableDeclarations.push(`${field.fieldName}?: Record<string, dayjs.Dayjs> | null`);
          } else if (field.fieldTypeLocalDateSaathratri || field.fieldTypeTimedSaathratri) {
            variableDeclarations.push(`${field.fieldName}?: dayjs.Dayjs | null`);
          } else if (field.fieldTypeSetSaathratri) {
            variableDeclarations.push(`${field.fieldName}?: Set<string> | null`);
          } else if (field.fieldTypeMapSaathratri) {
            variableDeclarations.push(`${field.fieldName}?: Record<string, ${field.tsType}> | null`);
          } else {
            variableDeclarations.push(`${field.fieldName}?: ${this.getTypescriptType(field)} | null`);
          }
        }
      }
    });

    return variableDeclarations;
  },

  getCompositePrimaryKeyClientVariableWithType(variablesWithTypes, fieldName, _isPrimaryKeyField) {
    let variableDeclarationStatement = '';

    for (const variablesWithType of variablesWithTypes) {
      const variablesWithTypeArr = variablesWithType.split('?:');

      if (variablesWithTypeArr && variablesWithTypeArr[0] === fieldName) {
        variableDeclarationStatement = variablesWithType;
        break;
      }
    }

    return variableDeclarationStatement;
  },
};
