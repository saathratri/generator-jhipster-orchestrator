import _ from 'lodash';

export const springDataCassandraSaathratriUtils = {
  /****************************************************
   * cassandra-spring-data-cassandra Helper Functions
   ****************************************************/

  generatePrimaryKeyMethods(entityClass, entityInstance, entityInstanceSnakeCase, primaryKey, fileType) {
    if (!primaryKey || !Array.isArray(primaryKey.ids)) {
      console.error('Invalid primary key details provided');
      return [];
    }

    const methodsCode = [];
    const methodComponents = {
      name: '',
      paramsDecl: '',
      paramsInst: '',
      javaDocParams: '',
      urlSubst: '',
      logSubst: '',
      resourceParamsDecl: '',
      repoQueryStr: '',
    };

    const findLastComponents = { ...methodComponents };
    const totalIds = primaryKey.ids.length;
    // Number of leading partition-key columns. A findAllBy that restricts only a PREFIX of the
    // partition key (paramCount < partitionCount) is illegal in Cassandra without ALLOW FILTERING,
    // so those repository methods get @AllowFiltering — the list search-form drives progressive
    // prefix search and would otherwise 500 on a partial-partition query.
    const partitionCount = primaryKey.ids.filter(pk => !pk.isClusteredKeySaathratri).length;

    primaryKey.ids.forEach((id, index) => {
      const { fieldName, fieldType, fieldNameHumanized, fieldNameUnderscored, isClusteredKeySaathratri, fieldTypeTimeUuidSaathratri } = id;

      this.appendMethodComponents(methodComponents, primaryKey.nameCapitalized, fieldName, fieldType, fieldNameHumanized);
      if (index < totalIds - 1) {
        this.appendMethodComponents(findLastComponents, primaryKey.nameCapitalized, fieldName, fieldType, fieldNameHumanized);
        if (primaryKey.hasTimeUUID) {
          const separator = findLastComponents.repoQueryStr ? ' AND ' : '';
          findLastComponents.repoQueryStr += `${separator}${fieldNameUnderscored} = ?${index}`;
        }
      }

      if (index < totalIds) {
        if (index === totalIds - 1) {
          this.addMethodDeclarations(methodsCode, entityClass, entityInstanceSnakeCase, 'findBy', methodComponents, fileType);
        } else {
          this.addMethodDeclarations(
            methodsCode,
            entityClass,
            entityInstanceSnakeCase,
            'findAllBy',
            methodComponents,
            fileType,
            // partial partition key (prefix shorter than the full partition) → ALLOW FILTERING
            index + 1 < partitionCount,
          );
        }
      }

      if (isClusteredKeySaathratri && (fieldType === 'Long' || fieldTypeTimeUuidSaathratri)) {
        this.addComparisonMethods(methodsCode, entityClass, entityInstanceSnakeCase, methodComponents, fileType);
      }
    });

    if (primaryKey.hasTimeUUID) {
      this.addMethodDeclarations(methodsCode, entityClass, entityInstanceSnakeCase, 'findLatestBy', findLastComponents, fileType);
    }

    return methodsCode;
  },

  appendMethodComponents(components, keyName, fieldName, fieldType, fieldNameHumanized) {
    const prefix = components.name ? 'And' : '';
    components.name += `${prefix}${keyName}${_.upperFirst(fieldName)}`;
    components.paramsDecl += components.paramsDecl ? ', ' : '';
    components.paramsDecl += `final ${fieldType} ${fieldName}`;
    components.paramsInst += components.paramsInst ? ', ' : '';
    components.paramsInst += fieldName;
    components.javaDocParams += ` * @param ${fieldName} the ${fieldNameHumanized} of the entity to retrieve.\n`;
    components.urlSubst += `/:${fieldName}`;
    components.logSubst += components.logSubst ? ', ' : '';
    components.logSubst += `${fieldName}: {}`;
    components.resourceParamsDecl += components.resourceParamsDecl ? ', ' : '';
    components.resourceParamsDecl += `@RequestParam(name = "${fieldName}", required = true) final ${fieldType} ${fieldName}`;
  },

  addMethodDeclarations(methodsCode, entityClass, entityInstanceSnakeCase, methodType, components, fileType, allowFiltering = false) {
    // Spring Data Cassandra adds the CQL `ALLOW FILTERING` clause to a derived query method
    // annotated with @AllowFiltering — required when the method restricts only part of the
    // partition key. Use the fully-qualified name to avoid managing an import in the template.
    const allowFilteringAnnotation = allowFiltering ? '@org.springframework.data.cassandra.repository.AllowFiltering\n' : '';
    // EXISTING: Generate non-paginated methods
    if (fileType === 'Service') {
      methodsCode.push(`${this.getPrimaryKeyMethodSignature(entityClass, methodType, components.name, '', components.paramsDecl)};`);
    } else if (fileType === 'Repository') {
      methodsCode.push(
        `${allowFilteringAnnotation}${this.getPrimaryKeyRepositoryMethodSignature(
          entityClass,
          entityInstanceSnakeCase,
          methodType,
          components.name,
          '',
          components.paramsDecl,
          components.repoQueryStr,
        )};`,
      );
    } else if (fileType === 'ServiceImpl') {
      methodsCode.push(
        this.generatePrimaryKeyServiceMethodImplementation(
          entityClass,
          methodType,
          components.name,
          '',
          components.paramsDecl,
          components.paramsInst,
        ),
      );
    } else if (fileType === 'Resource') {
      methodsCode.push(
        this.generatePrimaryKeyResourceMethodImplementation(
          entityClass,
          methodType,
          components.name,
          '',
          components.paramsInst,
          components.urlSubst,
          components.resourceParamsDecl,
          components.logSubst,
          components.javaDocParams,
          entityClass,
        ),
      );
    }

    // NEW: Generate paginated methods for findAllBy
    if (methodType === 'findAllBy') {
      if (fileType === 'Repository') {
        methodsCode.push(
          `${allowFilteringAnnotation}${this.getPaginatedRepositoryMethodSignature(
            entityClass,
            methodType,
            components.name,
            components.paramsDecl,
          )};`,
        );
      } else if (fileType === 'Service') {
        methodsCode.push(`${this.getPaginatedServiceMethodSignature(entityClass, methodType, components.name, components.paramsDecl)};`);
      } else if (fileType === 'ServiceImpl') {
        methodsCode.push(
          this.generatePaginatedServiceMethodImplementation(
            entityClass,
            methodType,
            components.name,
            components.paramsDecl,
            components.paramsInst,
          ),
        );
      } else if (fileType === 'Resource') {
        methodsCode.push(
          this.generatePaginatedResourceMethodImplementation(
            entityClass,
            methodType,
            components.name,
            components.paramsInst,
            components.urlSubst,
            components.resourceParamsDecl,
            components.logSubst,
            components.javaDocParams,
          ),
        );
      }
    }
  },

  addComparisonMethods(methodsCode, entityClass, entityInstanceSnakeCase, components, fileType) {
    // Generate comparison methods for clustering keys
    // LessThan (<), LessThanEqual (<=), GreaterThan (>), GreaterThanEqual (>=)
    ['LessThan', 'LessThanEqual', 'GreaterThan', 'GreaterThanEqual'].forEach(op => {
      this.addMethodDeclarations(
        methodsCode,
        entityClass,
        entityInstanceSnakeCase,
        'findAllBy',
        { ...components, name: components.name + op },
        fileType,
      );
    });
  },

  generatePrimaryKeyServiceMethodImplementation(
    entityClass,
    methodNamePrefix,
    methodNameString,
    operatorString,
    methodParametersDeclarationsString,
    methodParametersInstancesString,
  ) {
    let methodImplementationString = `@Override \npublic ${this.getPrimaryKeyMethodSignature(
      entityClass,
      methodNamePrefix,
      methodNameString,
      operatorString,
      methodParametersDeclarationsString,
    )}{\n`;
    methodImplementationString += `LOG.debug("Request to ${methodNamePrefix}${methodNameString}${operatorString}(${methodParametersDeclarationsString}) service in ${entityClass}ServiceImpl.");\n`;
    methodImplementationString += `return ${_.lowerFirst(entityClass)}Repository.${methodNamePrefix}${methodNameString}${operatorString}(${methodParametersInstancesString})\n`;

    if (methodNamePrefix === 'findAllBy') {
      methodImplementationString += `.stream()\n`;
    }

    methodImplementationString += `.map(${_.lowerFirst(entityClass)}Mapper::toDto)\n`;

    if (methodNamePrefix === 'findLatestBy') {
      methodImplementationString += '.orElse(null); // Return null if no record found\n';
    } else if (methodNamePrefix === 'findBy') {
      methodImplementationString += ';\n';
    } else {
      methodImplementationString += '.collect(Collectors.toCollection(LinkedList::new));\n';
    }

    methodImplementationString += '}\n';

    return methodImplementationString;
  },

  generatePrimaryKeyResourceMethodImplementation(
    entityClass,
    methodNamePrefix,
    methodNameString,
    operatorString,
    methodParametersInstancesString,
    methodUrlSubstitutionParameters,
    methodResourceParametersDeclarationsString,
    methodLogSubstitutionParameters,
    methodJavaDocParametersString,
    entityInstance,
  ) {
    let methodImplementationString = '/** \n';
    methodImplementationString += ` * // Composite Primary Key Code \n`;
    methodImplementationString += ` * {@code GET /${this.getCompositePrimaryKeyGetMappingUrl(methodNamePrefix + methodNameString + operatorString)}${methodUrlSubstitutionParameters}}\n`;
    methodImplementationString += ` * \n`;
    methodImplementationString += ` * \n`;
    methodImplementationString += `${methodJavaDocParametersString}`;
    methodImplementationString += ` * \n`;
    methodImplementationString += ` * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the ${entityInstance}, or with status {@code 404 (Not Found)}. \n`;
    methodImplementationString += ` */ \n`;
    methodImplementationString += `@GetMapping("/${this.getCompositePrimaryKeyGetMappingUrl(methodNamePrefix + methodNameString + operatorString)}")\n`;
    methodImplementationString += `public ${this.getPrimaryKeyMethodSignature(
      entityClass,
      methodNamePrefix,
      methodNameString,
      operatorString,
      methodResourceParametersDeclarationsString,
    )}{ \n`;
    methodImplementationString += '  // Composite Primary Key Code \n';
    methodImplementationString += `  LOG.debug("REST request to ${methodNamePrefix + methodNameString + operatorString} method for ${entityClass}s with parameteres ${methodLogSubstitutionParameters}", ${methodParametersInstancesString}); \n`;
    methodImplementationString += `  return  ${_.lowerFirst(entityInstance)}Service.${methodNamePrefix + methodNameString + operatorString}(${methodParametersInstancesString}); \n`;
    methodImplementationString += '}\n';

    return methodImplementationString;
  },

  getPrimaryKeyMethodSignature(entityClass, methodNamePrefix, methodNameString, operatorString, methodParametersDeclarationsString) {
    if (methodNamePrefix === 'findBy') {
      return `Optional<${entityClass}DTO> ${methodNamePrefix}${methodNameString}${operatorString}(${methodParametersDeclarationsString})`;
    } else if (methodNamePrefix === 'findLatestBy') {
      return `${entityClass}DTO ${methodNamePrefix}${methodNameString}${operatorString}(${methodParametersDeclarationsString})`;
    }
    return `List<${entityClass}DTO> ${methodNamePrefix}${methodNameString}${operatorString}(${methodParametersDeclarationsString})`;
  },

  getPrimaryKeyRepositoryMethodSignature(
    entityClass,
    entityInstanceSnakeCase,
    methodNamePrefix,
    methodNameString,
    operatorString,
    methodParametersDeclarationsString,
    methodRepositoryParametersQueryString,
  ) {
    if (methodNamePrefix === 'findBy') {
      return `Optional<${entityClass}> ${methodNamePrefix}${methodNameString}${operatorString}(${methodParametersDeclarationsString})`;
    } else if (methodNamePrefix === 'findAllBy') {
      return `List<${entityClass}> ${methodNamePrefix}${methodNameString}${operatorString}(${methodParametersDeclarationsString})`;
    } else if (methodNamePrefix === 'findLatestBy') {
      let methodImplementationString = `@Query("SELECT * FROM ${entityInstanceSnakeCase} WHERE ${methodRepositoryParametersQueryString} LIMIT 1")\n`;
      methodImplementationString += `Optional<${entityClass}> ${methodNamePrefix}${methodNameString}${operatorString}(${methodParametersDeclarationsString});\n`;

      return methodImplementationString;
    }
  },

  getCompositePrimaryKeyGetMappingUrl(methodName) {
    methodName = methodName.charAt(0).toLowerCase() + methodName.slice(1);

    return methodName.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
  },

  getCompositePrimaryKeyLogStatement(primaryKey) {
    return primaryKey.ids.map(pk => `${pk.fieldName}: {}`).join(', ');
  },

  getCompositePrimaryKeyResourceClassMethodQueryParameters(primaryKey) {
    return primaryKey.ids
      .map(pk => `@RequestParam(name = "${pk.fieldName}", required = true) final ${pk.fieldType} ${pk.fieldName}`)
      .join(', \n');
  },

  /****************************************************
   * Pagination Helper Functions (New - for Cassandra Slice-based pagination)
   ****************************************************/

  /**
   * Generate paginated repository method signature (Slice-based for Cassandra)
   * @param {string} entityClass - Entity class name
   * @param {string} methodType - Method type (e.g., 'findAllBy')
   * @param {string} methodName - Method name suffix
   * @param {string} params - Method parameters
   * @returns {string} Repository method signature
   */
  getPaginatedRepositoryMethodSignature(entityClass, methodType, methodName, params) {
    const paginatedParams = params ? `${params}, Pageable pageable` : 'Pageable pageable';
    return `Slice<${entityClass}> ${methodType}${methodName}(${paginatedParams})`;
  },

  /**
   * Generate paginated service method signature
   * @param {string} entityClass - Entity class name
   * @param {string} methodType - Method type (e.g., 'findAllBy')
   * @param {string} methodName - Method name suffix
   * @param {string} params - Method parameters
   * @returns {string} Service method signature
   */
  getPaginatedServiceMethodSignature(entityClass, methodType, methodName, params) {
    const paginatedParams = params ? `${params}, Pageable pageable` : 'Pageable pageable';
    return `Slice<${entityClass}DTO> ${methodType}${methodName}Pageable(${paginatedParams})`;
  },

  /**
   * Generate paginated service implementation
   * @param {string} entityClass - Entity class name
   * @param {string} methodType - Method type (e.g., 'findAllBy')
   * @param {string} methodName - Method name suffix
   * @param {string} params - Method parameter declarations
   * @param {string} paramsInst - Method parameter instances
   * @returns {string} Service method implementation
   */
  generatePaginatedServiceMethodImplementation(entityClass, methodType, methodName, params, paramsInst) {
    const _paginatedParams = params ? `${params}, Pageable pageable` : 'Pageable pageable';
    const paginatedParamsInst = paramsInst ? `${paramsInst}, pageable` : 'pageable';

    let impl = `@Override\n`;
    impl += `public ${this.getPaginatedServiceMethodSignature(entityClass, methodType, methodName, params)} {\n`;
    impl += `    LOG.debug("Request to ${methodType}${methodName}Pageable service in ${entityClass}ServiceImpl with pagination.");\n`;
    impl += `    return ${_.lowerFirst(entityClass)}Repository.${methodType}${methodName}(${paginatedParamsInst})\n`;
    impl += `        .map(${_.lowerFirst(entityClass)}Mapper::toDto);\n`;
    impl += `}\n`;

    return impl;
  },

  /**
   * Generate paginated resource method implementation with explicit pagingState parameter
   * for proper Cassandra cursor-based pagination.
   * @param {string} entityClass - Entity class name
   * @param {string} methodType - Method type
   * @param {string} methodName - Method name suffix
   * @param {string} paramsInst - Parameter instances
   * @param {string} urlSubst - URL substitution parameters
   * @param {string} resourceParams - Resource parameter declarations
   * @param {string} logSubst - Log substitution parameters
   * @param {string} javaDocParams - JavaDoc parameters
   * @returns {string} Resource method implementation
   */
  generatePaginatedResourceMethodImplementation(
    entityClass,
    methodType,
    methodName,
    paramsInst,
    urlSubst,
    resourceParams,
    logSubst,
    javaDocParams,
  ) {
    const methodNameFull = `${methodType}${methodName}Pageable`;
    const urlPath = this.getCompositePrimaryKeyGetMappingUrl(methodNameFull);
    // Use explicit pagingState and size parameters instead of Spring's Pageable
    const paginatedResourceParams = resourceParams
      ? `${resourceParams},\n        @RequestParam(name = "pagingState", required = false) String pagingState,\n        @RequestParam(name = "size", defaultValue = "20") int size`
      : '@RequestParam(name = "pagingState", required = false) String pagingState,\n        @RequestParam(name = "size", defaultValue = "20") int size';

    let impl = `/**\n`;
    impl += ` * {@code GET /${urlPath}${urlSubst}} : get paginated entities by composite key.\n`;
    impl += ` *\n`;
    impl += `${javaDocParams}`;
    impl += ` * @param pagingState the Cassandra paging state (Base64 URL-safe encoded) for cursor-based pagination.\n`;
    impl += ` * @param size the page size (default 20).\n`;
    impl += ` * @return the {@link ResponseEntity} with status {@code 200 (OK)} and the list of entities in body.\n`;
    impl += ` */\n`;
    impl += `@GetMapping("/${urlPath}")\n`;
    impl += `public ResponseEntity<List<${entityClass}DTO>> ${methodNameFull}(\n        ${paginatedResourceParams}\n) {\n`;
    impl += `    LOG.debug("REST request to get paginated ${entityClass}s with parameters ${logSubst}, pagingState: {}, size: {}", ${paramsInst}, pagingState, size);\n`;
    impl += `    \n`;
    impl += `    // Build CassandraPageRequest from pagingState parameter\n`;
    impl += `    CassandraPageRequest cassandraPageRequest;\n`;
    impl += `    if (pagingState == null || pagingState.isEmpty()) {\n`;
    impl += `        cassandraPageRequest = CassandraPageRequest.first(size);\n`;
    impl += `    } else {\n`;
    impl += `        try {\n`;
    impl += `            ByteBuffer pagingStateBuffer;\n`;
    impl += `            try {\n`;
    impl += `                // Try URL-safe Base64 decoding first\n`;
    impl += `                pagingStateBuffer = ByteBuffer.wrap(Base64.getUrlDecoder().decode(pagingState));\n`;
    impl += `            } catch (IllegalArgumentException e) {\n`;
    impl += `                // Fall back to standard Base64 decoding\n`;
    impl += `                pagingStateBuffer = ByteBuffer.wrap(Base64.getDecoder().decode(pagingState));\n`;
    impl += `            }\n`;
    impl += `            cassandraPageRequest = CassandraPageRequest.of(PageRequest.of(0, size), pagingStateBuffer);\n`;
    impl += `        } catch (IllegalArgumentException e) {\n`;
    impl += `            LOG.error("Invalid paging state for ${entityClass}s", e);\n`;
    impl += `            cassandraPageRequest = CassandraPageRequest.first(size);\n`;
    impl += `        }\n`;
    impl += `    }\n`;
    impl += `    \n`;
    impl += `    Slice<${entityClass}DTO> slice = ${_.lowerFirst(entityClass)}Service.${methodNameFull}(${paramsInst ? `${paramsInst}, ` : ''}cassandraPageRequest);\n`;
    impl += `    \n`;
    impl += `    // Generate Slice pagination headers (Cassandra cursor-based pagination)\n`;
    impl += `    HttpHeaders headers = new HttpHeaders();\n`;
    impl += `\n`;
    impl += `    boolean hasNext = slice.hasNext();\n`;
    impl += `    headers.add("X-Page-Size", String.valueOf(slice.getSize()));\n`;
    impl += `\n`;
    impl += `    // Extract paging state from current pageable (populated after query execution)\n`;
    impl += `    ByteBuffer nextPagingState = null;\n`;
    impl += `    if (hasNext && slice.getPageable() instanceof CassandraPageRequest) {\n`;
    impl += `        CassandraPageRequest currentCassandraPageRequest = (CassandraPageRequest) slice.getPageable();\n`;
    impl += `        nextPagingState = currentCassandraPageRequest.getPagingState();\n`;
    impl += `    }\n`;
    impl += `    if (hasNext && nextPagingState == null) {\n`;
    impl += `        try {\n`;
    impl += `            Pageable nextPageable = slice.nextPageable();\n`;
    impl += `            if (nextPageable instanceof CassandraPageRequest) {\n`;
    impl += `                nextPagingState = ((CassandraPageRequest) nextPageable).getPagingState();\n`;
    impl += `            }\n`;
    impl += `        } catch (IllegalStateException e) {\n`;
    impl += `            LOG.warn("Unable to resolve next paging state for ${entityClass}s", e);\n`;
    impl += `        }\n`;
    impl += `    }\n`;
    impl += `    hasNext = hasNext && nextPagingState != null;\n`;
    impl += `    if (nextPagingState != null) {\n`;
    impl += `        byte[] pagingStateBytes = new byte[nextPagingState.remaining()];\n`;
    impl += `        nextPagingState.duplicate().get(pagingStateBytes);\n`;
    impl += `        headers.add("X-Paging-State", Base64.getUrlEncoder().encodeToString(pagingStateBytes));\n`;
    impl += `    }\n`;
    impl += `    headers.add("X-Has-Next-Page", String.valueOf(hasNext));\n`;
    impl += `\n`;
    impl += `    return ResponseEntity.ok().headers(headers).body(slice.getContent());\n`;
    impl += `}\n`;

    return impl;
  },

  /****************************************************
   * Test Helper Functions (ResourceIT coverage for the generated composite-key search endpoints)
   ****************************************************/

  /**
   * Generate a single ResourceIT @Test method that exercises EVERY composite-key search endpoint
   * produced by generatePrimaryKeyMethods (partial partition-key list + cursor-paged `-pageable`
   * variants, clustering-key comparison operators, the full-key `findBy`, `findLatestBy`, and the
   * `/slice` cursor endpoint). It mirrors that function's iteration field-for-field so the test set
   * stays in lockstep with the endpoints as the key shape changes.
   *
   * Each endpoint is asserted with HTTP 200 only: that verifies the generated CQL + query-derivation
   * + parameter binding actually executes against a real Cassandra Testcontainer (the real risk for
   * generated code). Response-body shape is already asserted by the get/getAll tests.
   *
   * @returns {string} the @Test method source, or "" for non-composite keys.
   */
  generateCompositeKeySearchResourceITTests(
    entityClass,
    entityInstance,
    persistInstance,
    saveMethod,
    callBlock,
    primaryKey,
    transactionalAnnotation,
  ) {
    if (!primaryKey || !primaryKey.composite || !Array.isArray(primaryKey.ids)) {
      return '';
    }
    const { ids } = primaryKey;
    const totalIds = ids.length;
    const keyCap = primaryKey.nameCapitalized; // e.g. "CompositeId"
    const mockMvc = `rest${entityClass}MockMvc`;

    // .param("field", String.valueOf(persistInstance.getCompositeId().getField())) for the first n ids
    const paramChain = n =>
      ids
        .slice(0, n)
        .map(f => `.param("${f.fieldName}", String.valueOf(${persistInstance}.get${keyCap}().get${f.fieldNameCapitalized}()))`)
        .join('');

    const performAndOk = (url, paramCount, extra = '') =>
      `        ${mockMvc}.perform(get(ENTITY_API_URL + "/${this.getCompositePrimaryKeyGetMappingUrl(url)}")${paramChain(paramCount)}${extra}).andExpect(status().isOk());\n`;

    // Every search endpoint is now a valid runtime query: partial-partition-key findAllBy methods
    // carry @AllowFiltering (see generatePrimaryKeyMethods), and full-partition / clustering /
    // findBy queries are valid without it. So we assert 200 for ALL of them.
    const lines = [];
    let name = '';
    ids.forEach((id, index) => {
      name += `${name ? 'And' : ''}${keyCap}${_.upperFirst(id.fieldName)}`;
      const paramCount = index + 1;
      if (index === totalIds - 1) {
        // Full composite key: findBy<...> (returns the single entity).
        lines.push(performAndOk(`findBy${name}`, paramCount));
      } else {
        // Partition/clustering key prefix: list + cursor-paged variants.
        lines.push(performAndOk(`findAllBy${name}`, paramCount));
        lines.push(performAndOk(`findAllBy${name}Pageable`, paramCount, '.param("size", "20")'));
      }
      // Comparison operators are generated for clustering keys of type Long / TimeUUID (a plain and
      // a -pageable variant per operator).
      if (id.isClusteredKeySaathratri && (id.fieldType === 'Long' || id.fieldTypeTimeUuidSaathratri)) {
        ['LessThan', 'LessThanEqual', 'GreaterThan', 'GreaterThanEqual'].forEach(op => {
          lines.push(performAndOk(`findAllBy${name}${op}`, paramCount));
          lines.push(performAndOk(`findAllBy${name}${op}Pageable`, paramCount, '.param("size", "20")'));
        });
      }
    });

    // findLatestBy<all-but-last-field> exists when the key has a TimeUUID clustering column.
    if (primaryKey.hasTimeUUID && totalIds > 1) {
      let latestName = '';
      ids.slice(0, totalIds - 1).forEach(id => {
        latestName += `${latestName ? 'And' : ''}${keyCap}${_.upperFirst(id.fieldName)}`;
      });
      lines.push(performAndOk(`findLatestBy${latestName}`, totalIds - 1));
    }

    // Cursor-based /slice pagination over the whole table.
    lines.push(`        ${mockMvc}.perform(get(ENTITY_API_URL + "/slice").param("size", "20")).andExpect(status().isOk());\n`);

    let out = `\n    @Test${transactionalAnnotation}\n`;
    out += `    void getAll${entityClass}sByCompositeKeySearches() throws Exception {\n`;
    out += `        // Initialize the database\n`;
    out += `        ${entityInstance}Repository.${saveMethod}(${persistInstance})${callBlock};\n\n`;
    out += `        // Exercise every generated composite-key search endpoint (partial-partition findAllBy\n`;
    out += `        // carry @AllowFiltering, clustering/comparison/findBy are plain valid queries), plus\n`;
    out += `        // /slice. A 200 confirms the derived CQL + parameter binding executes against real\n`;
    out += `        // Cassandra; body shape is covered by the get()/getAll() tests above.\n`;
    out += lines.join('');
    out += `    }\n`;
    return out;
  },
};
