import BaseApplicationGenerator from 'generator-jhipster/generators/base-application';

export default class extends BaseApplicationGenerator {
  // Store vector changelog files to add to master.xml
  vectorChangelogFiles = [];

  constructor(args, opts, features) {
    super(args, opts, { ...features, sbsBlueprint: true });
  }

  get [BaseApplicationGenerator.INITIALIZING]() {
    return this.asInitializingTaskGroup({
      async initializingTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.PROMPTING]() {
    return this.asPromptingTaskGroup({
      async promptingTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.CONFIGURING]() {
    return this.asConfiguringTaskGroup({
      async configuringTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.COMPOSING]() {
    return this.asComposingTaskGroup({
      async composingTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.COMPOSING_COMPONENT]() {
    return this.asComposingComponentTaskGroup({
      async composingComponentTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.LOADING]() {
    return this.asLoadingTaskGroup({
      async loadingTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.PREPARING]() {
    return this.asPreparingTaskGroup({
      async preparingTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.CONFIGURING_EACH_ENTITY]() {
    return this.asConfiguringEachEntityTaskGroup({
      async configuringEachEntityTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.LOADING_ENTITIES]() {
    return this.asLoadingEntitiesTaskGroup({
      async loadingEntitiesTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.PREPARING_EACH_ENTITY]() {
    return this.asPreparingEachEntityTaskGroup({
      async preparingEachEntityTemplateTask({ entity }) {
        // Check if any field has VECTOR annotation and set entity-level flag
        const hasVectorFields = entity.fields.some(field => {
          const annotation = field.options?.customAnnotation?.[0];
          return annotation === 'VECTOR';
        });
        if (hasVectorFields) {
          entity.hasVectorFieldsSaathratri = true;
        }
      },
    });
  }

  get [BaseApplicationGenerator.PREPARING_EACH_ENTITY_FIELD]() {
    return this.asPreparingEachEntityFieldTaskGroup({
      async preparingEachEntityFieldTemplateTask({ entity, field }) {
        // Check for VECTOR custom annotation
        const vectorAnnotation = field.options?.customAnnotation?.[0];
        if (vectorAnnotation === 'VECTOR') {
          // Get the vector dimension from the second annotation (e.g., "1536")
          const vectorDimension = field.options?.customAnnotation?.[1] || '1536';

          // Set Liquibase column type to PostgreSQL vector type
          field.columnType = `vector(${vectorDimension})`;
          field.liquibaseType = `vector(${vectorDimension})`;

          // Mark field as vector type for template processing
          field.fieldTypeVectorSaathratri = true;
          field.vectorDimensionSaathratri = vectorDimension;

          // IMPORTANT: Vector fields should be in the JPA entity (for database access)
          // but excluded from DTOs (they are large - 1536 floats = ~6KB each)
          // The DTO template filters out fields with fieldTypeVectorSaathratri = true
          // Do NOT set field.transient = true as that removes the field from the entity entirely

          this.log.info(`Field '${field.fieldName}' configured as vector(${vectorDimension}) type for pgvector (excluded from DTO)`);
        }
      },
    });
  }

  get [BaseApplicationGenerator.PREPARING_EACH_ENTITY_RELATIONSHIP]() {
    return this.asPreparingEachEntityRelationshipTaskGroup({
      async preparingEachEntityRelationshipTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.POST_PREPARING_EACH_ENTITY]() {
    return this.asPostPreparingEachEntityTaskGroup({
      async postPreparingEachEntityTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.DEFAULT]() {
    return this.asDefaultTaskGroup({
      async defaultTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.WRITING]() {
    return this.asWritingTaskGroup({
      async writingTemplateTask({ application }) {
        await this.writeFiles({
          sections: { files: [{ templates: ['template-file-liquibase-orchestrator'] }] },
          context: application,
        });
        // Copy files for SQL-based applications
        if (application.databaseTypeSql) {
          await this.writeFiles({
            sections: {
              files: [
                {
                  // master.xml includes initial_data.xml at the end (after all entity and constraint changelogs)
                  path: 'src/main/resources/',
                  templates: [
                    {
                      file: 'config/liquibase/master.xml',
                    },
                  ],
                },
              ],
            },
            context: application,
          });
        }
      },
    });
  }

  get [BaseApplicationGenerator.WRITING_ENTITIES]() {
    return this.asWritingEntitiesTaskGroup({
      async writingEntitiesTemplateTask({ application, entities }) {
        // Only process SQL-based applications
        if (!application.databaseTypeSql) {
          return;
        }

        for (const entity of entities.filter(e => !e.builtIn)) {
          // Check if entity has vector fields
          const vectorFields = entity.fields.filter(field => field.fieldTypeVectorSaathratri === true);

          if (vectorFields.length > 0) {
            // Generate a unique changelog date for vector columns
            const now = new Date();
            const pad = (n, len = 2) => String(n).padStart(len, '0');
            const vectorChangelogDate = `${pad(now.getFullYear(), 4)}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
            const changelogFileName = `${vectorChangelogDate}_added_vector_${entity.entityClass}.xml`;

            await this.writeFiles({
              sections: {
                files: [
                  {
                    path: 'src/main/resources/',
                    templates: [
                      {
                        file: 'config/liquibase/changelog/added_vector_column_and_index.xml',
                        renameTo: () => `config/liquibase/changelog/${changelogFileName}`,
                      },
                    ],
                  },
                ],
              },
              context: {
                ...application,
                ...entity,
                vectorFields,
                changelogDate: vectorChangelogDate,
              },
            });

            // Track the changelog file for adding to master.xml later
            this.vectorChangelogFiles.push(changelogFileName);

            this.log.info(
              `Generated vector column changelog for entity '${entity.entityClass}' with ${vectorFields.length} vector field(s)`,
            );
          }

          // Index generation from @customQueryAnnotation, @entityGraphIncludeCustomAnnotation, @entityGraphExcludeCustomAnnotation
          const toSnakeCase = str =>
            str
              .replace(/([A-Z])/g, '_$1')
              .toLowerCase()
              .replace(/^_/, '');
          const customQueryIndexes = [];
          const relationships = entity.relationships || [];
          const relationshipNames = relationships.map(r => r.propertyName || r.relationshipName);

          // Helper: generate FK/join table indexes for a list of eager relationship names
          const addEagerRelIndexes = (eagerRels, source) => {
            for (const relName of eagerRels) {
              const rel = relationships.find(r => (r.propertyName || r.relationshipName) === relName || r.relationshipName === relName);
              if (!rel) continue;

              if (rel.relationshipManyToMany && rel.ownerSide) {
                // ManyToMany owning side only: join table exists, index its FK back to this entity
                // Skip inverse ManyToMany (ownerSide=false) — join table is owned by the other entity
                const joinTable = rel.joinTable?.name || `rel_${entity.entityTableName}__${toSnakeCase(relName)}`;
                const fkColumn = `${entity.entityTableName}_id`;
                const indexName = `idx_${joinTable}_${fkColumn}`;
                customQueryIndexes.push({
                  methodName: `jt-${source}-${relName}`,
                  columnNames: [fkColumn],
                  indexName,
                  tableName: joinTable,
                });
              } else if (rel.relationshipManyToOne || (rel.relationshipOneToOne && rel.ownerSide)) {
                // ManyToOne or owning OneToOne: FK column lives on this entity's table
                // Skip inverse OneToOne (mappedBy) — FK is on the other table
                const fkColumn = rel.joinColumnNames?.[0] || `${toSnakeCase(relName)}_id`;
                const indexName = `idx_${entity.entityTableName}_${fkColumn}`;
                customQueryIndexes.push({
                  methodName: `fk-${source}-${relName}`,
                  columnNames: [fkColumn],
                  indexName,
                  tableName: entity.entityTableName,
                });
              } else if (rel.relationshipOneToMany) {
                // OneToMany: FK is on the child table, skip (child entity should index its own FK)
              }
            }
          };

          // 1. Process @entityGraphIncludeCustomAnnotation
          const entityGraphInclude = entity.entityGraphIncludeCustomAnnotation ?? entity.annotations?.entityGraphIncludeCustomAnnotation;
          if (entityGraphInclude) {
            const rawInclude = Array.isArray(entityGraphInclude) ? entityGraphInclude : [entityGraphInclude];
            for (const directive of rawInclude) {
              if (typeof directive !== 'string') continue;
              const colonIdx = directive.indexOf(':');
              if (colonIdx < 0) continue;
              const rawAttrs = directive.substring(colonIdx + 1).trim();
              const attrs = rawAttrs
                .replace(/^\s*\[\s*|\s*\]\s*$/g, '')
                .split(',')
                .map(a => a.trim())
                .filter(Boolean);
              addEagerRelIndexes(attrs, 'egIncl');
            }
          }

          // 2. Process @entityGraphExcludeCustomAnnotation (include ALL relationships EXCEPT excluded ones)
          const entityGraphExclude = entity.entityGraphExcludeCustomAnnotation ?? entity.annotations?.entityGraphExcludeCustomAnnotation;
          if (entityGraphExclude) {
            const rawExclude = Array.isArray(entityGraphExclude) ? entityGraphExclude : [entityGraphExclude];
            for (const directive of rawExclude) {
              if (typeof directive !== 'string') continue;
              const colonIdx = directive.indexOf(':');
              if (colonIdx < 0) continue;
              const rawAttrs = directive.substring(colonIdx + 1).trim();
              const excluded = rawAttrs
                .replace(/^\s*\[\s*|\s*\]\s*$/g, '')
                .split(',')
                .map(a => a.trim())
                .filter(Boolean);
              const included = relationshipNames.filter(name => !excluded.includes(name));
              addEagerRelIndexes(included, 'egExcl');
            }
          }

          // 3. Process @customQueryAnnotation
          const customQueryAnnotation = entity.customQueryAnnotation ?? entity.annotations?.customQueryAnnotation;
          if (customQueryAnnotation) {
            const rawDirectives = Array.isArray(customQueryAnnotation) ? customQueryAnnotation : [customQueryAnnotation];
            const directives = rawDirectives.flatMap(d =>
              typeof d === 'string'
                ? d
                    .split('|')
                    .map(s => s.trim())
                    .filter(Boolean)
                : [d],
            );

            for (const directive of directives) {
              if (typeof directive !== 'string') continue;
              const colonIdx = directive.indexOf(':');
              if (colonIdx < 0) continue;
              const methodName = directive.substring(0, colonIdx).trim();
              const rest = directive.substring(colonIdx + 1).trim();

              // Parse params for 'index' flag
              if (/\bindex\b/.test(rest)) {
                const paramsMatch = rest.match(/params\s*\[\s*([^\]]*)\s*\]/);
                const params = paramsMatch
                  ? paramsMatch[1]
                      .split(',')
                      .map(p => p.trim())
                      .filter(Boolean)
                  : [];
                if (params.length > 0) {
                  const columnNames = params.map(paramName => {
                    const field = entity.fields.find(f => f.fieldName === paramName);
                    return field ? field.fieldNameAsDatabaseColumn || field.columnName || toSnakeCase(paramName) : toSnakeCase(paramName);
                  });
                  // Skip index on primary key (already indexed)
                  const isPkOnly = columnNames.length === 1 && columnNames[0] === 'id';
                  if (!isPkOnly) {
                    const indexName = `idx_${entity.entityTableName}_${columnNames.join('_')}`;
                    customQueryIndexes.push({
                      methodName: `param-${methodName}`,
                      columnNames,
                      indexName,
                      tableName: entity.entityTableName,
                    });
                  }
                }
              }

              // Parse eager[] for FK/join table indexes
              const eagerMatch = rest.match(/eager\s*\[\s*([^\]]*)\s*\]/);
              if (eagerMatch) {
                const eagerRels = eagerMatch[1]
                  .split(',')
                  .map(e => e.trim())
                  .filter(Boolean);
                addEagerRelIndexes(eagerRels, `cq-${methodName}`);
              }
            }
          }

          // Deduplicate by indexName
          const seen = new Set();
          const dedupedIndexes = customQueryIndexes.filter(idx => {
            if (seen.has(idx.indexName)) return false;
            seen.add(idx.indexName);
            return true;
          });

          if (dedupedIndexes.length > 0) {
            const now = new Date();
            const pad = (n, len = 2) => String(n).padStart(len, '0');
            const indexChangelogDate = `${pad(now.getFullYear(), 4)}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
            const indexChangelogFileName = `${indexChangelogDate}_added_custom_query_indexes_${entity.entityClass}.xml`;

            await this.writeFiles({
              sections: {
                files: [
                  {
                    path: 'src/main/resources/',
                    templates: [
                      {
                        file: 'config/liquibase/changelog/added_custom_query_indexes.xml',
                        renameTo: () => `config/liquibase/changelog/${indexChangelogFileName}`,
                      },
                    ],
                  },
                ],
              },
              context: {
                ...application,
                ...entity,
                customQueryIndexes: dedupedIndexes,
                changelogDate: indexChangelogDate,
              },
            });

            this.vectorChangelogFiles.push(indexChangelogFileName);
            this.log.info(
              `Generated custom query index changelog for entity '${entity.entityClass}' with ${dedupedIndexes.length} index(es)`,
            );
          }
        }
      },
    });
  }

  get [BaseApplicationGenerator.POST_WRITING]() {
    return this.asPostWritingTaskGroup({
      async postWritingTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.POST_WRITING_ENTITIES]() {
    return this.asPostWritingEntitiesTaskGroup({
      async postWritingEntitiesTemplateTask({ application }) {
        // Only process SQL-based applications
        if (!application.databaseTypeSql) {
          return;
        }

        // Add vector/index changelogs to master.xml
        if (this.vectorChangelogFiles.length > 0) {
          const masterXmlPath = `${this.destinationPath()}/src/main/resources/config/liquibase/master.xml`;

          this.editFile(masterXmlPath, content => {
            // Build include statements for all changelogs
            const includes = this.vectorChangelogFiles
              .map(file => `    <include file="config/liquibase/changelog/${file}" relativeToChangelogFile="false"/>`)
              .join('\n');

            // Try needle first, fall back to inserting before </databaseChangeLog>
            const needle = '<!-- saathratri-needle-liquibase-add-vector-changelog - Saathratri will add vector column changelogs here -->';
            if (content.includes(needle)) {
              return content.replace(needle, `${includes}\n    ${needle}`);
            }
            return content.replace('</databaseChangeLog>', `${includes}\n</databaseChangeLog>`);
          });

          this.log.info(`Added ${this.vectorChangelogFiles.length} changelog(s) to master.xml`);
        }
      },
    });
  }

  get [BaseApplicationGenerator.LOADING_TRANSLATIONS]() {
    return this.asLoadingTranslationsTaskGroup({
      async loadingTranslationsTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.INSTALL]() {
    return this.asInstallTaskGroup({
      async installTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.POST_INSTALL]() {
    return this.asPostInstallTaskGroup({
      async postInstallTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.END]() {
    return this.asEndTaskGroup({
      async endTemplateTask() {},
    });
  }
}
