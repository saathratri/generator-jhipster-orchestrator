import fs from 'fs';
import path from 'path';

import _ from 'lodash';

const LAST_USED_PORT_FILE = 'last-used-ports.json';

export const cassandraSpringBootUtils = {
  /*******************************************
   * cassandra-spring-boot-utils Helper Functions
   *******************************************/
  getFieldPrimitiveType(field) {
    switch (field.fieldType) {
      case 'String':
        return '.toString()';
      case 'Integer':
        return '.intValue()';
      case 'Long':
        return '.intValue()';
      case 'Float':
        return '.intValue()';
      case 'Double':
        return '.intValue()';
      case 'UUID':
        return '.toString()';
      default:
        return '.toString()';
    }
  },

  setSaathratriNonPrimaryKeySampleValues(entity) {
    if (!entity.fields) return;
    entity.fields.forEach(field => {
      if (field.fieldTypeSetSaathratri) {
        field.javaValueSample1 = `new java.util.TreeSet<${field.fieldType}>() {{ add("${field.fieldName}1"); }}`;
        field.javaValueSample2 = `new java.util.TreeSet<${field.fieldType}>() {{ add("${field.fieldName}2"); }}`;
      } else if (field.fieldTypeMapSaathratri) {
        if (field.fieldType === 'String') {
          field.javaValueSample1 = `new java.util.HashMap<String, ${field.fieldType}>() {{ put("${field.fieldName}1", "${field.fieldName}1"); }}`;
          field.javaValueSample2 = `new java.util.HashMap<String, ${field.fieldType}>() {{ put("${field.fieldName}2", "${field.fieldName}2"); }}`;
        } else if (field.fieldType === 'Integer') {
          field.javaValueSample1 = `new java.util.HashMap<String, ${field.fieldType}>() {{ put("${field.fieldName}1", 1); }}`;
          field.javaValueSample2 = `new java.util.HashMap<String, ${field.fieldType}>() {{ put("${field.fieldName}2", 2); }}`;
        } else if (field.fieldType === 'Long') {
          field.javaValueSample1 = `new java.util.HashMap<String, ${field.fieldType}>() {{ put("${field.fieldName}1", 1L); }}`;
          field.javaValueSample2 = `new java.util.HashMap<String, ${field.fieldType}>() {{ put("${field.fieldName}2", 2L); }}`;
        } else if (field.fieldType === 'Boolean') {
          field.javaValueSample1 = `new java.util.HashMap<String, ${field.fieldType}>() {{ put("${field.fieldName}1", false); }}`;
          field.javaValueSample2 = `new java.util.HashMap<String, ${field.fieldType}>() {{ put("${field.fieldName}2", true); }}`;
        } else if (field.fieldTypeBigDecimalSaathratri) {
          field.javaValueSample1 = `new java.util.HashMap<String, ${field.fieldType}>() {{ put("${field.fieldName}1", new BigDecimal(1)); }}`;
          field.javaValueSample2 = `new java.util.HashMap<String, ${field.fieldType}>() {{ put("${field.fieldName}2", new BigDecimal(2)); }}`;
        }
      } else if (field.fieldType === 'Boolean') {
        field.javaValueSample1 = 'false';
        field.javaValueSample2 = 'true';
      } else if (field.fieldType === 'LocalDate') {
        field.javaValueSample1 = 'java.time.LocalDate.now()';
        field.javaValueSample2 = 'java.time.LocalDate.now()';
      } else if (field.fieldTypeBigDecimalSaathratri) {
        field.javaValueSample1 = 'new BigDecimal(1)';
        field.javaValueSample2 = 'new BigDecimal(2)';
      }

      if (!field.isCompositePrimaryKeyField) {
        field.includeField = true;
      }
    });
  },

  /**************************************
   * cassandra-spring-boot-utils Helper Functions
   **************************************/
  getCompositePrimaryKeyInstanceVariableInitializationsFromDTOTest(primaryKey) {
    return primaryKey.ids
      .map(pk => {
        return `${this.getPrimaryKeyValue(pk.fieldType)}`;
      })
      .join(', \n');
  },

  /*********************************
   * entity-spri Helper Functions
   *********************************/

  getCompositePrimaryKeyInstanceVariablesFromDTOId(entityInstanceName, primaryKey) {
    return primaryKey.ids
      .map(pk => `${entityInstanceName}DTO.get${_.upperFirst(primaryKey.name)}().get${_.upperFirst(pk.fieldName)}()`)
      .join(', \n');
  },

  getCompositePrimaryKeyNullCheck(entityInstanceName, primaryKey, dtoMapstruct) {
    if (dtoMapstruct) {
      return primaryKey.ids
        .map(pk => `${entityInstanceName}DTO.get${_.upperFirst(primaryKey.name)}().get${_.upperFirst(pk.fieldName)}() == null`)
        .join(' || \n');
    }
    return primaryKey.ids
      .map(pk => `${entityInstanceName}.get${_.upperFirst(primaryKey.name)}().get${_.upperFirst(pk.fieldName)}() == null`)
      .join(' || \n');
  },

  getCompositePrimaryKeyTimeUuidInitializations(entityInstance, primaryKey) {
    return primaryKey.ids
      .map(pk => {
        if (pk.fieldTypeTimeUuidSaathratri) {
          return `${entityInstance}DTO.get${_.upperFirst(primaryKey.name)}().set${_.upperFirst(pk.fieldName)}(Uuids.timeBased());`;
        }
      })
      .join('\n');
  },

  getCompositePrimaryKeyResponseEntityUri(entityInstanceName, primaryKey, dtoMapstruct) {
    if (dtoMapstruct) {
      return primaryKey.ids
        .map(pk =>
          pk.fieldTypeString
            ? `getUrlEncodedParameterValue(${entityInstanceName}.get${_.upperFirst(primaryKey.name)}().get${_.upperFirst(pk.fieldName)}())`
            : `${entityInstanceName}.get${_.upperFirst(primaryKey.name)}().get${_.upperFirst(pk.fieldName)}()`,
        )
        .join(' + "/" + \n');
    }
    return primaryKey.ids
      .map(pk => `${entityInstanceName}.get${_.upperFirst(primaryKey.name)}().get${_.upperFirst(pk.fieldName)}()`)
      .join(' + "/" + \n');
  },

  getCompositePrimaryKeyEquivalenceCheck(entityInstanceName, primaryKey, dtoMapstruct) {
    if (dtoMapstruct) {
      return primaryKey.ids
        .map(
          pk =>
            `!Objects.equals(${pk.fieldName}, ${entityInstanceName}DTO.get${_.upperFirst(primaryKey.name)}().get${_.upperFirst(pk.fieldName)}())`,
        )
        .join(' || \n');
    }
    return primaryKey.ids
      .map(
        pk =>
          `!Objects.equals(${pk.fieldName}, ${entityInstanceName}.get${_.upperFirst(primaryKey.name)}().get${_.upperFirst(pk.fieldName)}())`,
      )
      .join(' || \n');
  },

  getCompositePrimaryKeyPutPatchGetDeleteMappingJavaDocUrl(primaryKey) {
    return primaryKey.ids.map(pk => `:${pk.fieldName}`).join('/');
  },

  getCompositePrimaryKeyPutPatchGetDeleteMappingJavaDocMethodParameters(entityInstanceName, primaryKey, operation) {
    return primaryKey.ids
      .map(pk => `      * @param ${pk.fieldName} the ${pk.fieldNameHumanized} of the ${entityInstanceName} to ${operation}.`)
      .join('\n');
  },

  getCompositePrimaryKeyPutPatchGetDeleteMappingUrl(primaryKey) {
    return primaryKey.ids.map(pk => `{${pk.fieldName}}`).join('/');
  },

  getCompositePrimaryKeyInstanceVariables(primaryKey) {
    return primaryKey.ids.map(pk => pk.fieldName).join(', \n');
  },

  getCompositePrimaryKeyPutPatchMappingMethodPathVariableParameters(primaryKey) {
    return primaryKey.ids
      .map(pk => `@PathVariable(value = "${pk.fieldName}", required = true) final ${pk.fieldType} ${pk.fieldName}`)
      .join(', \n');
  },

  getCompositePrimaryKeyGetDeleteMappingSetStatements(primaryKey) {
    return primaryKey.ids.map(pk => `${primaryKey.name}.set${_.upperFirst(pk.fieldName)}(${pk.fieldName});`).join('\n');
  },

  getCompositePrimaryKeyTestSetIdStatement(fieldStatus, entityInstanceName, entityClassName, primaryKey) {
    return `${entityInstanceName}.set${_.upperFirst(primaryKey.name)}(new ${entityClassName}Id(${primaryKey.ids
      .map(pk => `${fieldStatus}${pk.fieldNameUnderscored.toUpperCase()}`)
      .join(', ')}));`;
  },

  getCompositePrimaryKeyServerUrl(entityInstanceName, primaryKey) {
    return primaryKey.ids
      .map(pk => `${entityInstanceName}.get${_.upperFirst(primaryKey.name)}().get${_.upperFirst(pk.fieldName)}()`)
      .join(' + "/" + ');
  },

  isCompositePrimaryKeyServerReference(primaryKey, reference) {
    if (!primaryKey || !reference) {
      return false;
    }

    const primaryKeyFieldNames = primaryKey.ids.map(pk => pk.fieldName);
    /* Saathratri change: support both JHipster 8 (reference.name) and JHipster 9 (reference.propertyName/fieldName) */
    const refName = reference.name || reference.propertyName || reference.fieldName;
    return primaryKeyFieldNames.includes(refName);
  },

  isCompositePrimaryKeyServerProperty(primaryKey, property) {
    if (!primaryKey || !property) {
      return false;
    }

    const primaryKeyFieldNames = primaryKey.ids.map(pk => pk.fieldName);
    return primaryKeyFieldNames.includes(property.propertyName);
  },

  setSaathratriPrimaryKeyAttributesOnEntityAndFields(entity) {
    if (!entity.fields) return;

    this.initializeSaathratriPrimaryKeyAttributes(entity);

    this.initializeSaathratriFieldAttributes(entity);

    this.sortIdsByOrdinal(entity);

    entity.restProperties = [...entity.fields];
  },

  sortIdsByOrdinal(entity) {
    // Sort the ids array by fieldOrdinalSaathratri
    if (entity.primaryKeySaathratri.ids.length > 1) {
      entity.primaryKeySaathratri.ids.sort((a, b) => a.fieldOrdinalSaathratri - b.fieldOrdinalSaathratri);
    }
  },

  initializeSaathratriPrimaryKeyAttributes(entity) {
    if (!entity.primaryKeySaathratri) {
      entity.primaryKeySaathratri = { composite: false, ids: [] };
      if (!entity.fields) return;

      entity.fields.forEach(field => {
        this.processFieldForPrimaryKey(entity, field);
        field.fieldJavaValueGenerator = this.getJavaValueGeneratorForType(field.fieldType);
      });
    }
  },

  processFieldForPrimaryKey(entity, field) {
    const primaryKeyType = field.options?.customAnnotation[0];

    if (primaryKeyType === 'PrimaryKeyType.PARTITIONED') {
      this.handlePartitionedKey(entity, field);
    } else if (primaryKeyType === 'PrimaryKeyType.CLUSTERED') {
      this.handleClusteredKey(entity, field);
    }

    field.fieldValidationRequiredSaathratri = true;
  },

  handlePartitionedKey(entity, field) {
    entity.primaryKeySaathratri.composite = false;
    field.isCompositePrimaryKeyField = true;
    field.isPartitionedKeySaathratri = true;
    field.isClusteredKeySaathratri = false;

    if (this.isTimeUuidField(field)) {
      entity.primaryKeySaathratri.hasTimeUUID = true;
    } else if (this.isUuidField(field)) {
      entity.primaryKeySaathratri.hasUUID = true;
    }

    entity.primaryKeySaathratri.ids.push(field);
  },

  handleClusteredKey(entity, field) {
    entity.primaryKeySaathratri.composite = true;
    entity.primaryKeySaathratri.nameCapitalized = 'CompositeId';
    entity.primaryKeySaathratri.name = 'compositeId';
    entity.primaryKeySaathratri.type = `${entity.name}Id`;
    entity.primaryKeySaathratri.typeString = false;

    if (field.fieldType === 'Long') {
      entity.primaryKeySaathratri.hasLong = true;
    } else if (field.fieldType === 'Integer') {
      entity.primaryKeySaathratri.hasInteger = true;
    } else if (this.isTimeUuidField(field)) {
      entity.primaryKeySaathratri.hasTimeUUID = true;
    } else if (this.isUuidField(field)) {
      entity.primaryKeySaathratri.hasUUID = true;
    }

    field.isCompositePrimaryKeyField = true;
    field.isPartitionedKeySaathratri = false;
    field.isClusteredKeySaathratri = true;

    entity.primaryKeySaathratri.ids.push(field);
  },

  initializeSaathratriFieldAttributes(entity) {
    for (const field of entity.fields) {
      if (!field.hidden) {
        this.processEntityAttributes(entity, field);
        this.processFieldTypeAttributes(field);
      }
    }
  },

  processEntityAttributes(entity, field) {
    if (entity?.anyFieldIsDateDerivedSaathratri !== true) {
      if (this.isDateField(field)) {
        entity.anyFieldIsDateDerivedSaathratri = true;
      } else {
        entity.anyFieldIsDateDerivedSaathratri = false;
      }
    }

    if (entity?.anyFieldIsTimeDerivedSaathratri !== true) {
      if (this.isTimeField(field)) {
        entity.anyFieldIsTimeDerivedSaathratri = true;
        // Any field which is time derived is also date derived.
        entity.anyFieldIsDateDerivedSaathratri = true;
      } else {
        entity.anyFieldIsTimeDerivedSaathratri = false;
      }
    }

    if (entity?.anyFieldIsSetSaathratri !== true) {
      if (this.isSetField(field)) {
        entity.anyFieldIsSetSaathratri = true;
      } else {
        entity.anyFieldIsSetSaathratri = false;
      }
    }

    if (entity?.anyFieldIsMapSaathratri !== true) {
      if (this.isMapField(field)) {
        entity.anyFieldIsMapSaathratri = true;
      } else {
        entity.anyFieldIsMapSaathratri = false;
      }
    }

    if (entity?.anyFieldIsMapBooleanSaathratri !== true) {
      if (this.isMapBooleanField(field)) {
        entity.anyFieldIsMapBooleanSaathratri = true;
      } else {
        entity.anyFieldIsMapBooleanSaathratri = false;
      }
    }

    if (entity?.anyFieldIsMapDayjsSaathratri !== true) {
      if (this.isMapDayjsField(field)) {
        entity.anyFieldIsMapDayjsSaathratri = true;
      } else {
        entity.anyFieldIsMapDayjsSaathratri = false;
      }
    }

    if (entity?.anyFieldIsMapNumberSaathratri !== true) {
      if (this.isMapNumberField(field)) {
        entity.anyFieldIsMapNumberSaathratri = true;
      } else {
        entity.anyFieldIsMapNumberSaathratri = false;
      }
    }

    if (entity?.anyFieldIsMapStringSaathratri !== true) {
      if (this.isMapStringField(field)) {
        entity.anyFieldIsMapStringSaathratri = true;
      } else {
        entity.anyFieldIsMapStringSaathratri = false;
      }
    }

    if (entity?.anyFieldHasImageContentType !== true) {
      if (this.isBlobFieldContentType(field, 'image')) {
        entity.anyFieldHasImageContentType = true;
        entity.anyFieldHasFileBasedContentType = true;
        entity.anyFieldIsBlobDerived = true;
      } else {
        entity.anyFieldHasImageContentType = false;
      }
    }

    if (entity?.anyFieldHasTextContentType !== true) {
      if (this.isBlobFieldContentType(field, 'text')) {
        entity.anyFieldHasTextContentType = true;
        entity.anyFieldIsBlobDerived = true;
      } else {
        entity.anyFieldHasTextContentType = false;
      }
    }

    if (entity?.anyFieldHasAnyContentType !== true) {
      if (this.isBlobFieldContentType(field, 'any')) {
        entity.anyFieldHasAnyContentType = true;
        entity.anyFieldHasFileBasedContentType = true;
        entity.anyFieldIsBlobDerived = true;
      } else {
        entity.anyFieldHasAnyContentType = false;
      }
    }

    if (entity?.anyFieldIsTimeUUIDSaathratri !== true) {
      if (this.isTimeUuidField(field)) {
        entity.anyFieldIsTimeUUIDSaathratri = true;
      } else {
        entity.anyFieldIsTimeUUIDSaathratri = false;
      }
    }

    if (entity?.anyFieldIsUUIDSaathratri !== true) {
      if (this.isUuidField(field)) {
        entity.anyFieldIsUUIDSaathratri = true;
      } else {
        entity.anyFieldIsUUIDSaathratri = false;
      }
    }
  },

  isDateField(field) {
    const annotation = field.options?.customAnnotation[2];
    return annotation === 'UTC_DATE';
  },

  isTimeField(field) {
    const annotation = field.options?.customAnnotation[2];
    return annotation === 'UTC_DATETIME';
  },

  isBlobFieldContentType(field, contentType) {
    const cassandraNameAnnotation = field.options?.customAnnotation[1];
    const contentTypeAnnotation = field.options?.customAnnotation[2];

    return cassandraNameAnnotation === 'CassandraType.Name.BLOB' && contentTypeAnnotation === contentType;
  },

  isTimeUuidField(field) {
    const annotation = field.options?.customAnnotation[1];
    return annotation === 'CassandraType.Name.TIMEUUID';
  },

  isUuidField(field) {
    const annotation = field.options?.customAnnotation[1];
    return annotation === 'CassandraType.Name.UUID';
  },

  isSetField(field) {
    const annotation = field.options?.customAnnotation[0];
    return annotation === 'CassandraType.Name.SET';
  },

  isMapField(field) {
    const annotation = field.options?.customAnnotation[0];
    return annotation === 'CassandraType.Name.MAP';
  },

  isMapBooleanField(field) {
    const annotation = field.options?.customAnnotation[0];
    const annotation2 = field.options?.customAnnotation[1];
    return annotation === 'CassandraType.Name.MAP' && annotation2 === 'CassandraType.Name.BOOLEAN';
  },

  isMapNumberField(field) {
    const annotation = field.options?.customAnnotation[0];
    const annotation2 = field.options?.customAnnotation[1];
    return annotation === 'CassandraType.Name.MAP' && annotation2 === 'CassandraType.Name.DECIMAL';
  },

  isMapDayjsField(field) {
    const annotation = field.options?.customAnnotation[0];
    const annotation2 = field.options?.customAnnotation[1];
    const annotation3 = field.options?.customAnnotation[2];
    return annotation === 'CassandraType.Name.MAP' && annotation2 === 'CassandraType.Name.BIGINT' && annotation3 === 'UTC_DATETIME';
  },

  isMapStringField(field) {
    const annotation = field.options?.customAnnotation[0];
    const annotation2 = field.options?.customAnnotation[1];
    return annotation === 'CassandraType.Name.MAP' && annotation2 === 'CassandraType.Name.TEXT';
  },

  processFieldTypeAttributes(field) {
    if (this.isSetField(field)) {
      field.fieldTypeSetSaathratri = true;
    } else if (this.isMapField(field)) {
      field.fieldTypeMapSaathratri = true;
    }

    if (this.isMapBooleanField(field)) {
      field.fieldTypeMapBooleanSaathratri = true;
    } else if (this.isMapStringField(field)) {
      field.fieldTypeMapStringSaathratri = true;
    } else if (this.isMapDayjsField(field)) {
      field.fieldTypeMapDayjsSaathratri = true;
    } else if (this.isMapNumberField(field)) {
      field.fieldTypeMapNumberSaathratri = true;
    }

    if (this.isDateField(field)) {
      field.fieldTypeLocalDateSaathratri = true;
      field.fieldContainsUtcSaathratri = true;
      field.fieldTypeTemporal = true;
    } else if (this.isTimeField(field)) {
      field.fieldTypeTimedSaathratri = true;
      field.fieldContainsUtcSaathratri = true;
      field.fieldTypeTemporal = true;
    } else if (this.isUuidField(field)) {
      field.fieldTypeUuidSaathratri = true;
    } else if (this.isTimeUuidField(field)) {
      field.fieldTypeTemporal = true;
      field.fieldTypeTimeUuidSaathratri = true;
    } else if (field.fieldType === 'BigDecimal') {
      field.fieldTypeBigDecimalSaathratri = true;
    } else if (this.isBlobFieldContentType(field, 'image')) {
      field.fieldTypeBlobContent = 'image';
      field.fieldTypeByteBuffer = true;
      field.fieldWithContentType = true;
      field.fieldTypeBinarySaathratri = true;
      field.blobContentTypeTextSaathratri = false;
      field.blobContentTypeImage = true;
    } else if (this.isBlobFieldContentType(field, 'text')) {
      field.fieldTypeBlobContent = 'text';
      field.fieldTypeByteBuffer = true;
      field.fieldWithContentType = true;
      field.fieldTypeBinarySaathratri = true;
      field.blobContentTypeTextSaathratri = true;
      field.javaValueSample1 = `"${field.fieldName}1"`;
    } else if (this.isBlobFieldContentType(field, 'any')) {
      field.fieldTypeBlobContent = 'any';
      field.fieldTypeByteBuffer = true;
      field.fieldWithContentType = true;
      field.fieldTypeBinarySaathratri = true;
      field.blobContentTypeTextSaathratri = false;
      field.blobContentTypeAny = true;
    }

    if (field.options?.customAnnotation[3]) {
      field.fieldOrdinalSaathratri = field.options.customAnnotation[3];
    }
  },

  getJavaValueGeneratorForType(type) {
    // Check for specific types and return their respective value generation expressions
    if (type === 'String') {
      return 'UUID.randomUUID().toString()';
    } else if (type === 'UUID') {
      return 'UUID.randomUUID()';
    } else if (type === 'Integer') {
      return 'intCount.incrementAndGet()';
    } else if (type === 'Long') {
      return 'longCount.incrementAndGet()';
    } else if (type === 'Boolean') {
      return 'false';
    }
    // Optionally, handle unknown or unsupported types
    return 'UnsupportedType';
  },

  getLastUsedPortsFile(destinationPath) {
    return path.join(destinationPath, '..', LAST_USED_PORT_FILE);
  },

  getApplicationPortData(destinationPath, _appName) {
    // Path to the last-used-port.json file
    const portFilePath = this.getLastUsedPortsFile(destinationPath);

    // Read the last used port
    let portData;
    try {
      portData = JSON.parse(fs.readFileSync(portFilePath, 'utf8'));
    } catch {
      portData = {};
    }

    // Ensure the appName key exists
    if (
      !portData.lastUsedInterNodeCommunicationNonSslPort ||
      !portData.lastUsedInterNodeCommunicationSslPort ||
      !portData.lastUsedJmxMonitoringPort ||
      !portData.lastUsedNativeTransportCqlPort ||
      !portData.lastUsedThriftTransportPort
    ) {
      portData.lastUsedInterNodeCommunicationNonSslPort = 7000;
      portData.lastUsedInterNodeCommunicationSslPort = 7001;
      portData.lastUsedJmxMonitoringPort = 7199;
      portData.lastUsedNativeTransportCqlPort = 9042;
      portData.lastUsedThriftTransportPort = 9160;
    }

    // Write the last used port
    fs.writeFileSync(portFilePath, JSON.stringify(portData, null, 2));

    return portData;
  },

  incrementAndSetLastUsedPort(destinationPath, appName) {
    // Path to the last-used-port.json file
    const portFilePath = this.getLastUsedPortsFile(destinationPath);

    // Read the last used port
    let portData;
    try {
      portData = JSON.parse(fs.readFileSync(portFilePath, 'utf8'));

      // Check if the appName exists in portData
      if (!portData[appName]) {
        portData[appName] = {
          interNodeCommunicationNonSslPort: portData.lastUsedInterNodeCommunicationNonSslPort,
          interNodeCommunicationSslPort: portData.lastUsedInterNodeCommunicationSslPort,
          jmxMonitoringPort: portData.lastUsedJmxMonitoringPort,
          nativeTransportCqlPort: portData.lastUsedNativeTransportCqlPort,
          thriftTransportPort: portData.lastUsedThriftTransportPort,
        };

        // Increment the last used port for the next microservice
        portData.lastUsedInterNodeCommunicationNonSslPort += 100;
        portData.lastUsedInterNodeCommunicationSslPort += 100;
        portData.lastUsedJmxMonitoringPort += 100;
        portData.lastUsedNativeTransportCqlPort += 100;
        portData.lastUsedThriftTransportPort += 100;
      }

      // Write the updated port data to the file
      fs.writeFileSync(portFilePath, JSON.stringify(portData, null, 2));

      return portData;
    } catch (error) {
      console.error(`Failed to update port data: ${error.message}`);
      throw error;
    }
  },

  /**
   * @private
   * Convert to Java bean name case
   *
   * Handle the specific case when the second letter is capitalized
   * See http://stackoverflow.com/questions/2948083/naming-convention-for-getters-setters-in-java
   *
   * @param beanName
   * @return
   */
  javaBeanCase(beanName) {
    const secondLetter = beanName.charAt(1);
    if (secondLetter && secondLetter === secondLetter.toUpperCase()) {
      return beanName;
    }
    return _.upperFirst(beanName);
  },

  /**
   * @private
   * Create a java getter of reference.
   *
   * @param {object|string[]} reference
   * @return {string}
   */
  buildJavaGet(reference) {
    let refPath;
    if (typeof reference === 'string') {
      refPath = [reference];
    } else if (Array.isArray(reference)) {
      refPath = reference;
    } else {
      /* Saathratri change: support both JHipster 8 (reference.name) and JHipster 9 (reference.propertyName/fieldName) */
      refPath = [reference.name || reference.propertyName || reference.fieldName];
    }
    return refPath.map(partialPath => `get${this.javaBeanCase(partialPath)}()`).join('.');
  },

  /**
   * @private
   * Create a java getter method of reference.
   *
   * @param {object} reference
   * @param {string} type
   * @return {string}
   */
  buildJavaGetter(reference, type = reference.type || reference.propertyDtoJavaType || reference.fieldType) {
    /* Saathratri change: support both JHipster 8 and 9 property names */
    const refName = reference.name || reference.propertyName || reference.fieldName;
    return `${type} get${this.javaBeanCase(refName)}()`;
  },

  /**
   * @private
   * Create a java setter method of reference.
   *
   * @param {object} reference
   * @param {string} valueDefinition
   * @return {string}
   */
  buildJavaSetter(reference, valueDefinition) {
    /* Saathratri change: support both JHipster 8 and 9 property names */
    const refName = reference.name || reference.propertyName || reference.fieldName;
    const refType = reference.type || reference.propertyDtoJavaType || reference.fieldType;
    if (!valueDefinition) {
      valueDefinition = `${refType} ${refName}`;
    }
    return `set${this.javaBeanCase(refName)}(${valueDefinition})`;
  },

  /**
   * @private
   * Returns the primary key value based on the primary key type, DB and default value
   *
   * @param {string} primaryKey - the primary key type
   * @param {string} databaseType - the database type
   * @param {number} defaultValue - default value
   * @returns {string} java primary key value
   */
  getPrimaryKeyValue(primaryKey, databaseType, defaultValue = 1) {
    if (typeof primaryKey === 'object' && primaryKey.composite) {
      return `new ${primaryKey.type}(${primaryKey.references
        .map(ref => this.getPrimaryKeyValue(ref, databaseType, defaultValue))
        .join(', ')})`;
    }

    const primaryKeyType = typeof primaryKey === 'string' ? primaryKey : primaryKey.type;
    return this.getJavaValueGeneratorForType(primaryKeyType);
  },
};
