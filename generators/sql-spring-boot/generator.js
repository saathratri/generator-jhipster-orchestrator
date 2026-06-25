import BaseApplicationGenerator from 'generator-jhipster/generators/base-application';
import { javaMainPackageTemplatesBlock, javaTestPackageTemplatesBlock } from 'generator-jhipster/generators/java/support';

import { describeExcludedRelationship, getExcludedRelationships } from './lazy-relationship-utils.js';
import { sqlSpringBootUtils } from './sql-spring-boot-utils.js';

export default class extends BaseApplicationGenerator {
  constructor(args, opts, features) {
    super(args, opts, { ...features, sbsBlueprint: true });
  }

  async beforeQueue() {
    await this.dependsOnBootstrapApplication();
    // spring-boot bootstrap derives application.springBoot4 (and other spring-boot
    // properties) used by this generator's templates (e.g. application-dev.yml.ejs).
    // In a full app run spring-boot:bootstrap already runs first; declaring it here
    // makes this sub-generator self-sufficient (and testable in isolation).
    await this.dependsOnBootstrap('spring-boot');
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
      async composingTemplateTask() {
        await this.composeWithJHipster('jhipster-orchestrator:sql-spring-boot:data-relational');
      },
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
        // Detect self-referential ManyToOne relationships (tree parent pointers)
        if (!entity.relationships || entity.relationships.length === 0) {
          return;
        }
        const selfRefRelationship = entity.relationships.find(
          r => r.otherEntityName === entity.entityClass && (r.relationshipManyToOne || r.relationshipOneToMany === false),
        );
        if (selfRefRelationship) {
          entity.hasSelfReferentialTreeSaathratri = true;
          entity.treeParentFieldNameSaathratri = selfRefRelationship.relationshipFieldName; // e.g., "child"
          entity.treeParentFieldNameCapitalizedSaathratri = selfRefRelationship.relationshipNameCapitalized; // e.g., "Child"
          // Find the inverse collection (children)
          const childrenRelationship = entity.relationships.find(r => r.otherEntityName === entity.entityClass && r.relationshipOneToMany);
          if (childrenRelationship) {
            entity.treeChildrenFieldNameSaathratri = childrenRelationship.relationshipFieldNamePlural; // e.g., "parents"
          }
          this.log.info(`Entity '${entity.entityClass}' has self-referential tree via '${selfRefRelationship.relationshipFieldName}'`);
        }
      },
    });
  }

  get [BaseApplicationGenerator.PREPARING_EACH_ENTITY_FIELD]() {
    return this.asPreparingEachEntityFieldTaskGroup({
      async preparingEachEntityFieldTemplateTask({ application, entity, field }) {
        // Check for VECTOR custom annotation to exclude from DTOs
        const vectorAnnotation = field.options?.customAnnotation?.[0];
        if (vectorAnnotation === 'VECTOR') {
          // Get the vector dimension from the second annotation (e.g., "1536")
          const vectorDimension = field.options?.customAnnotation?.[1] || '1536';

          // Mark field as vector type for exclusion from DTO
          field.fieldTypeVectorSaathratri = true;
          field.vectorDimensionSaathratri = vectorDimension;
          field.propertyDtoJavaType = 'float[]';

          // Override blob field type to float[] for pgvector compatibility
          field.javaFieldType = 'float[]';
          field.fieldTypeBytes = false;
          field.fieldWithContentType = false;
          field.fieldTypeBinary = false;
          field.blobContentTypeText = false;
          field.blobContentTypeAny = false;
          field.blobContentTypeImage = false;
          field.fieldTypeBlobContent = undefined;
          field.fieldTypeBlob = false;
          field.columnType = `vector(${vectorDimension})`;
          field.loadColumnType = `vector(${vectorDimension})`;
          field.fieldDefaultValue = '"[0.1, 0.2]"';
          field.fieldUpdatedValue = '"[0.3, 0.4]"';

          // Determine the source field name (the field this embedding is derived from)
          const sourceFieldName = field.fieldName.replace(/Embedding$/, '');
          field.sourceFieldNameSaathratri = sourceFieldName;
          field.sourceFieldNameCapitalizedSaathratri = sourceFieldName.charAt(0).toUpperCase() + sourceFieldName.slice(1);

          // IMPORTANT: Vector fields should be in the JPA entity (for database access)
          // but excluded from DTOs (they are large - 1536 floats = ~6KB each)
          // The DTO template filters out fields with fieldTypeVectorSaathratri = true
          // Do NOT set field.transient = true as that removes the field from the entity entirely

          // Track vector entities at application level for embedding service generation
          application.hasVectorFieldsSaathratri = true;
          application.vectorEntitiesSaathratri = application.vectorEntitiesSaathratri || [];

          // Find or create entity entry in vectorEntitiesSaathratri
          let vectorEntity = application.vectorEntitiesSaathratri.find(e => e.entityClass === entity.entityClass);
          if (!vectorEntity) {
            vectorEntity = {
              entityClass: entity.entityClass,
              entityInstance: entity.entityInstance,
              entityInstancePlural: entity.entityInstancePlural,
              vectorFields: [],
            };
            application.vectorEntitiesSaathratri.push(vectorEntity);
          }

          // Add this field to the entity's vector fields
          vectorEntity.vectorFields.push({
            fieldName: field.fieldName,
            fieldNameCapitalized: field.fieldNameCapitalized,
            sourceFieldName,
            sourceFieldNameCapitalized: field.sourceFieldNameCapitalizedSaathratri,
            vectorDimension,
          });

          this.log.info(
            `Field '${field.fieldName}' in entity '${entity.entityClass}' marked as vector(${vectorDimension}) type (source: ${sourceFieldName}, excluded from DTO)`,
          );
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
      async postPreparingEachEntityTemplateTask({ entity }) {
        // Deduplicate entityJavaFilterableProperties to prevent compilation errors
        // This can happen when multiple relationships generate the same filter name
        // (e.g., two relationships both named "workOrder" would both generate "workOrderId" filter)
        if (entity.entityJavaFilterableProperties && entity.entityJavaFilterableProperties.length > 0) {
          const seen = new Set();
          const duplicates = [];
          const uniqueProperties = [];

          for (const prop of entity.entityJavaFilterableProperties) {
            const filterName = prop.propertyJavaFilterName;
            if (seen.has(filterName)) {
              duplicates.push(filterName);
            } else {
              seen.add(filterName);
              uniqueProperties.push(prop);
            }
          }

          if (duplicates.length > 0) {
            this.log.warn(
              `Entity '${entity.entityClass}' has duplicate filter names in Criteria class: [${duplicates.join(', ')}]. ` +
                `This is likely caused by multiple relationships with the same name. ` +
                `Consider renaming one of the relationships in your JDL to avoid conflicts. ` +
                `Duplicates have been removed to prevent compilation errors.`,
            );
            entity.entityJavaFilterableProperties = uniqueProperties;
          }
        }

        // Also deduplicate relationships array for QueryService specification building
        // to ensure consistency with the deduplicated Criteria filters
        if (entity.relationships && entity.relationships.length > 0) {
          const seenRelationships = new Set();
          const duplicateRelationships = [];
          const uniqueRelationships = [];

          for (const rel of entity.relationships) {
            // The filter name is based on relationshipNameCapitalized + "Id"
            const filterKey = rel.relationshipNameCapitalized;
            if (seenRelationships.has(filterKey)) {
              duplicateRelationships.push(rel.relationshipName);
            } else {
              seenRelationships.add(filterKey);
              uniqueRelationships.push(rel);
            }
          }

          if (duplicateRelationships.length > 0) {
            this.log.warn(
              `Entity '${entity.entityClass}' has duplicate relationship names: [${duplicateRelationships.join(', ')}]. ` +
                `Only the first occurrence will be used in QueryService specifications.`,
            );
            entity.relationships = uniqueRelationships;
          }
        }
      },
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
        if (application.applicationTypeMicroservice) {
          sqlSpringBootUtils.getApplicationPortData(this.destinationPath(), this.appname);
          const portData = sqlSpringBootUtils.incrementAndSetLastUsedPort(this.destinationPath(), this.appname);
          this.log(`The server port is: ${portData[this.appname].port}`);
          application.devJdbcUrlSaathratri = `jdbc:postgresql://localhost:${portData[this.appname].port}/${application.devDatabaseName}`;
        } else {
          // For gateways and monoliths, use the standard JHipster JDBC URL
          application.devJdbcUrlSaathratri = application.devJdbcUrl;
        }

        // JHipster 9.1.0 moved `microfrontend` (and related client ports) into the client
        // generator's application mutation, so they are absent when this server-focused
        // subgenerator re-renders application-dev.yml without the client app-prep having run.
        // Default them to upstream's "no client" values so the shared template renders.
        application.microfrontend ??= false;
        application.devServerPort ??= 4200;
        application.devServerPortProxy ??= application.devServerPort;

        await this.writeFiles({
          sections: {
            files: [
              {
                templates: ['template-file-sql-spring-boot', 'src/main/resources/config/application-dev.yml'],
              },
            ],
          },
          context: application,
        });

        // Write embedding service files if any entity has vector fields
        if (application.hasVectorFieldsSaathratri && application.vectorEntitiesSaathratri?.length > 0) {
          this.log.info(`Generating embedding services for ${application.vectorEntitiesSaathratri.length} entities with vector fields`);
          await this.writeFiles({
            sections: {
              files: [
                {
                  templates: [
                    {
                      sourceFile: 'src/main/java/_package_/config/EmbeddingConfiguration.java.ejs',
                      destinationFile: ctx => `src/main/java/${ctx.packageFolder}/config/EmbeddingConfiguration.java`,
                    },
                    {
                      sourceFile: 'src/main/java/_package_/service/embedding/EmbeddingService.java.ejs',
                      destinationFile: ctx => `src/main/java/${ctx.packageFolder}/service/embedding/EmbeddingService.java`,
                    },
                    {
                      sourceFile: 'src/main/java/_package_/service/embedding/EmbeddingMigrationService.java.ejs',
                      destinationFile: ctx => `src/main/java/${ctx.packageFolder}/service/embedding/EmbeddingMigrationService.java`,
                    },
                    {
                      sourceFile: 'src/main/java/_package_/service/embedding/EmbeddingStartupMigrationRunner.java.ejs',
                      destinationFile: ctx => `src/main/java/${ctx.packageFolder}/service/embedding/EmbeddingStartupMigrationRunner.java`,
                    },
                    {
                      sourceFile: 'src/main/java/_package_/web/rest/EmbeddingMigrationResource.java.ejs',
                      destinationFile: ctx => `src/main/java/${ctx.packageFolder}/web/rest/EmbeddingMigrationResource.java`,
                    },
                    {
                      sourceFile: 'src/main/java/_package_/domain/converter/PgVectorType.java.ejs',
                      destinationFile: ctx => `src/main/java/${ctx.packageFolder}/domain/converter/PgVectorType.java`,
                    },
                    {
                      sourceFile: 'src/test/java/_package_/service/embedding/EmbeddingServiceTest.java.ejs',
                      destinationFile: ctx => `src/test/java/${ctx.packageFolder}/service/embedding/EmbeddingServiceTest.java`,
                    },
                  ],
                },
              ],
            },
            context: application,
          });
        }

        // pom.xml modifications are done in POST_WRITING via editFile
        // to avoid needing springBootDependencies from upstream generator
      },
    });
  }

  get [BaseApplicationGenerator.WRITING_ENTITIES]() {
    return this.asWritingEntitiesTaskGroup({
      async writingEntitiesTemplateTask({ application, entities }) {
        for (const entity of entities.filter(e => !e.builtIn)) {
          entity.serviceImpl = true;

          const mainTemplates = [
            'web/rest/_entityClass_Resource.java',
            'service/_entityClass_Service.java',
            'service/impl/_entityClass_ServiceImpl.java',
          ];
          if (entity.jpaMetamodelFiltering) {
            mainTemplates.push('service/_entityClass_QueryService.java');
          }

          await this.writeFiles({
            sections: {
              files: [
                {
                  condition: generator => generator.databaseTypeSql && !entity.skipServer && entity.dtoMapstruct,
                  ...javaMainPackageTemplatesBlock('_entityPackage_/'),
                  templates: mainTemplates,
                },
                {
                  condition: generator => generator.databaseTypeSql && !entity.skipServer && entity.dtoMapstruct,
                  ...javaMainPackageTemplatesBlock('_entityPackage_/'),
                  templates: ['service/dto/_dtoClass_.java', 'service/mapper/_entityClass_Mapper.java'],
                },
                {
                  condition: generator => generator.databaseTypeSql && !entity.skipServer && entity.dtoMapstruct,
                  ...javaTestPackageTemplatesBlock('_entityPackage_/'),
                  templates: ['web/rest/_entityClass_ResourceIT.java'],
                },
              ],
            },
            context: { ...application, ...entity, ...sqlSpringBootUtils },
          });
        }
      },
    });
  }

  get [BaseApplicationGenerator.POST_WRITING]() {
    return this.asPostWritingTaskGroup({
      async postWritingTemplateTask({ application }) {
        const pomFile = 'pom.xml';

        // Patch maven-compiler-plugin with fork mode and increased memory for MapStruct
        this.editFile(pomFile, content => {
          if (!content.includes('<fork>true</fork>')) {
            content = content.replace(
              '                        <parameters>true</parameters>\n                        <annotationProcessorPaths>',
              '                        <parameters>true</parameters>\n' +
                '                        <!-- Fork the compiler in a separate process with more memory -->\n' +
                '                        <!-- This helps prevent OutOfMemoryError during MapStruct annotation processing -->\n' +
                '                        <!-- especially with complex entity relationships -->\n' +
                '                        <fork>true</fork>\n' +
                '                        <meminitial>2048m</meminitial>\n' +
                '                        <maxmem>8192m</maxmem>\n' +
                '                        <annotationProcessorPaths>',
            );
          }
          return content;
        });

        // Hibernate bytecode enhancement was tried to kill inverse @OneToOne
        // N+1 queries on the Full-details entity graph, but the only published
        // enhance-plugin versions (6.6.x Final, 7.0.0 Alpha/Beta) are not
        // bytecode-compatible with the 7.2.x hibernate-core that Spring Boot
        // 4.0.3 pulls in - runtime hits AbstractMethodError: $$_hibernate_setInstanceId.
        // We've switched to nested entity-graph paths instead (see
        // POST_WRITING_ENTITIES below). This block now only serves to STRIP
        // any lingering enhance-plugin config from poms generated by earlier
        // runs, so they converge cleanly.
        if (application.databaseTypeSql) {
          this.editFile(pomFile, content => {
            const before = content;
            content = content.replace(
              /^ *<hibernate-enhance-maven-plugin\.version>[^<]*<\/hibernate-enhance-maven-plugin\.version>\n/m,
              '',
            );
            content = content.replace(
              /^ *<plugin>\n(?: *<groupId>[^<]*<\/groupId>\n)? *<artifactId>hibernate-enhance-maven-plugin<\/artifactId>[\s\S]*?<\/plugin>\n/m,
              '',
            );
            if (content !== before) {
              this.log.info('[sql-spring-boot] Stripped stale hibernate-enhance-maven-plugin config from pom.xml');
            }
            return content;
          });
        }

        // The integration tests run against a Testcontainers PostgreSQL. JHipster generates it with
        // the plain `postgres` image, which has no pgvector — so the vector(n) column DDL (and the
        // CREATE EXTENSION changeset) fail and the whole ApplicationContext won't load. Dev/prod get
        // pgvector from the postgres init script + the pgvector image; point the test container at the
        // same pgvector image so every vector-bearing entity's *ResourceIT can load its context.
        if (application.hasVectorFieldsSaathratri && application.packageFolder) {
          const pkgFolderSaathratri = application.packageFolder.replace(/\/+$/, '');
          const dbTestcontainerPath = `src/test/java/${pkgFolderSaathratri}/config/DatabaseTestcontainer.java`;
          this.editFile(dbTestcontainerPath, content => {
            if (typeof content !== 'string') return content;
            return content.replace(/(new PostgreSQLContainer(?:<>)?\()"postgres:[^"]*"/, '$1"pgvector/pgvector:pg17"');
          });
        }

        // Create the pgvector extension before any vector(n) column. The vector column itself is
        // emitted into the entity changelog via field.columnType, which runs ahead of the per-entity
        // changelog patcher below (that patcher reads on-disk changelogs that aren't written yet at
        // POST_WRITING_ENTITIES, so it can't reliably prepend CREATE EXTENSION). Write a dedicated
        // early changelog and wire it ahead of every changelog include in master.xml instead.
        // Idempotent (IF NOT EXISTS): a no-op in dev/prod, which also get it from the postgres init
        // script; the Testcontainers test DB has no init script and relies solely on this changeSet.
        if (application.hasVectorFieldsSaathratri) {
          const extChangelog = 'src/main/resources/config/liquibase/changelog/00000000000001_added_vector_extension.xml';
          this.fs.write(
            this.destinationPath(extChangelog),
            `<?xml version="1.0" encoding="utf-8"?>\n` +
              `<databaseChangeLog\n` +
              `    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"\n` +
              `    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n` +
              `    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-latest.xsd">\n` +
              `    <!-- Saathratri: create the pgvector extension before any vector(n) column is created. -->\n` +
              `    <changeSet id="00000000000001-create-vector-extension" author="jhipster">\n` +
              `        <sql dbms="postgresql">CREATE EXTENSION IF NOT EXISTS vector</sql>\n` +
              `    </changeSet>\n` +
              `</databaseChangeLog>\n`,
          );
          this.editFile('src/main/resources/config/liquibase/master.xml', content => {
            if (typeof content !== 'string' || content.includes('00000000000001_added_vector_extension.xml')) return content;
            return content.replace(
              /(\n[ \t]*)(<include file="config\/liquibase\/changelog\/)/,
              `$1<include file="config/liquibase/changelog/00000000000001_added_vector_extension.xml" relativeToChangelogFile="false"/>$1$2`,
            );
          });
        }

        // Add Spring AI dependencies if any entity has vector fields
        if (application.hasVectorFieldsSaathratri) {
          this.editFile(pomFile, content => {
            // Add Spring AI version property
            if (!content.includes('spring-ai.version')) {
              content = content.replace('    </properties>', '        <spring-ai.version>2.0.0</spring-ai.version>\n    </properties>');
            }

            // Add Spring AI BOM to dependencyManagement
            if (!content.includes('spring-ai-bom')) {
              if (content.includes('</dependencyManagement>')) {
                // Insert into existing dependencyManagement
                content = content.replace(
                  '        </dependencies>\n    </dependencyManagement>',
                  '            <dependency>\n' +
                    '                <groupId>org.springframework.ai</groupId>\n' +
                    '                <artifactId>spring-ai-bom</artifactId>\n' +
                    '                <version>${spring-ai.version}</version>\n' +
                    '                <type>pom</type>\n' +
                    '                <scope>import</scope>\n' +
                    '            </dependency>\n' +
                    '        </dependencies>\n    </dependencyManagement>',
                );
              } else {
                // Create dependencyManagement section before <dependencies>
                content = content.replace(
                  '\n    <dependencies>',
                  '\n    <dependencyManagement>\n' +
                    '        <dependencies>\n' +
                    '            <dependency>\n' +
                    '                <groupId>org.springframework.ai</groupId>\n' +
                    '                <artifactId>spring-ai-bom</artifactId>\n' +
                    '                <version>${spring-ai.version}</version>\n' +
                    '                <type>pom</type>\n' +
                    '                <scope>import</scope>\n' +
                    '            </dependency>\n' +
                    '        </dependencies>\n' +
                    '    </dependencyManagement>\n\n    <dependencies>',
                );
              }
            }

            // Add Spring AI OpenAI dependency (must run BEFORE repository insertion
            // so the </dependencyManagement>\n\n    <dependencies> anchor still matches)
            if (!content.includes('spring-ai-openai')) {
              // Try to match after </dependencyManagement> first
              const depMgmtPattern = '</dependencyManagement>\n\n    <dependencies>\n';
              // Spring AI 2.0.0 GA's spring-ai-openai brings only openai-java-core; the okhttp
              // transport (com.openai.client.okhttp.OpenAIOkHttpClient, used by EmbeddingConfiguration)
              // must be declared explicitly. Pin to the 4.39.1 line spring-ai-openai:2.0.0 manages.
              const openAiDeps =
                '        <dependency>\n' +
                '            <groupId>org.springframework.ai</groupId>\n' +
                '            <artifactId>spring-ai-openai</artifactId>\n' +
                '        </dependency>\n' +
                '        <dependency>\n' +
                '            <groupId>com.openai</groupId>\n' +
                '            <artifactId>openai-java-client-okhttp</artifactId>\n' +
                '            <version>4.39.1</version>\n' +
                '        </dependency>\n';
              if (content.includes(depMgmtPattern)) {
                content = content.replace(depMgmtPattern, `</dependencyManagement>\n\n    <dependencies>\n${openAiDeps}`);
              } else {
                // No dependencyManagement section, first <dependencies> is the main one
                content = content.replace('    <dependencies>\n', `    <dependencies>\n${openAiDeps}`);
              }
            }

            // Add Spring milestones repository (runs AFTER OpenAI dep insertion)
            if (!content.includes('spring-milestones')) {
              if (content.includes('<repositories>')) {
                content = content.replace(
                  '<repositories>',
                  '<repositories>\n' +
                    '        <repository>\n' +
                    '            <id>spring-milestones</id>\n' +
                    '            <name>Spring Milestones</name>\n' +
                    '            <url>https://repo.spring.io/milestone</url>\n' +
                    '            <snapshots>\n' +
                    '                <enabled>false</enabled>\n' +
                    '            </snapshots>\n' +
                    '        </repository>',
                );
              } else {
                // Insert before the main <dependencies> (after </dependencyManagement> if present)
                const repoAnchor = content.includes('</dependencyManagement>')
                  ? '</dependencyManagement>\n\n    <dependencies>'
                  : '\n    <dependencies>';
                const repoReplacement = content.includes('</dependencyManagement>')
                  ? '</dependencyManagement>\n\n    <repositories>\n' +
                    '        <repository>\n' +
                    '            <id>spring-milestones</id>\n' +
                    '            <name>Spring Milestones</name>\n' +
                    '            <url>https://repo.spring.io/milestone</url>\n' +
                    '            <snapshots>\n' +
                    '                <enabled>false</enabled>\n' +
                    '            </snapshots>\n' +
                    '        </repository>\n' +
                    '    </repositories>\n\n    <dependencies>'
                  : '\n    <repositories>\n' +
                    '        <repository>\n' +
                    '            <id>spring-milestones</id>\n' +
                    '            <name>Spring Milestones</name>\n' +
                    '            <url>https://repo.spring.io/milestone</url>\n' +
                    '            <snapshots>\n' +
                    '                <enabled>false</enabled>\n' +
                    '            </snapshots>\n' +
                    '        </repository>\n' +
                    '    </repositories>\n\n    <dependencies>';
                content = content.replace(repoAnchor, repoReplacement);
              }
            }

            return content;
          });
        }
      },
    });
  }

  get [BaseApplicationGenerator.POST_WRITING_ENTITIES]() {
    return this.asPostWritingEntitiesTaskGroup({
      async postWritingEntitiesTemplateTask({ entities, application }) {
        const packageFolder = (
          application.packageFolder ??
          (application.packageName ? `${application.packageName.replace(/\./g, '/')}/` : undefined) ??
          ''
        ).replace(/\/+$/, '');
        if (!packageFolder) {
          this.log.warn(
            '[sql-spring-boot] POST_WRITING_ENTITIES: packageFolder and packageName are both unavailable, skipping file patches',
          );
          return;
        }

        // Patch Liquibase changelogs for vector fields
        for (const entity of entities.filter(e => !e.builtIn && !e.skipServer)) {
          const vectorFields = (entity.fields ?? []).filter(f => f.fieldTypeVectorSaathratri);
          if (vectorFields.length === 0) continue;

          // Find and patch the Liquibase changelog for this entity
          const fs = await import('fs');
          const changelogDir = this.destinationPath('src/main/resources/config/liquibase/changelog');
          let files = [];
          try {
            const suffix = `_added_entity_${entity.entityClass}.xml`;
            files = fs.readdirSync(changelogDir).filter(f => f.endsWith(suffix));
          } catch {
            // Directory may not exist yet
          }

          for (const file of files) {
            const changelogPath = this.destinationPath(`src/main/resources/config/liquibase/changelog/${file}`);
            try {
              let content = this.fs.read(changelogPath);
              if (!content) continue;

              for (const field of vectorFields) {
                const columnName = field.fieldNameAsDatabaseColumn;
                // Replace blob type with vector type
                const blobRegex = new RegExp(`<column name="${columnName}" type="\\$\\{blobType\\}">`, 'g');
                content = content.replace(blobRegex, `<column name="${columnName}" type="vector(${field.vectorDimensionSaathratri})">`);

                // Also fix loadData column type
                const loadBlobRegex = new RegExp(`<column name="${columnName}" type="blob"/>`, 'g');
                content = content.replace(loadBlobRegex, `<column name="${columnName}" type="skip"/>`);

                // Remove content_type columns
                const contentTypeRegex = new RegExp(
                  `\\s*<column name="${columnName}_content_type"[^/]*/?>\\s*(<constraints [^/]*/?>\\s*)?</column>\\s*`,
                  'g',
                );
                content = content.replace(contentTypeRegex, '\n');

                // Remove simple content_type column entries
                const simpleContentTypeRegex = new RegExp(`\\s*<column name="${columnName}_content_type"[^>]*/>\\s*`, 'g');
                content = content.replace(simpleContentTypeRegex, '\n');
              }

              // Add HNSW indexes for vector similarity search (cosine distance)
              if (!content.includes('hnsw') && !content.includes('vector_cosine_ops')) {
                const indexChangeset = vectorFields
                  .map(field => {
                    const columnName = field.fieldNameAsDatabaseColumn;
                    const indexName = `idx_${entity.entityTableName}_${columnName}_hnsw`;
                    return `
    <changeSet id="${entity.changelogDate}-vector-idx-${columnName}" author="jhipster">
        <sql>CREATE INDEX IF NOT EXISTS ${indexName} ON ${entity.entityTableName} USING hnsw (${columnName} vector_cosine_ops)</sql>
    </changeSet>`;
                  })
                  .join('\n');

                content = content.replace('</databaseChangeLog>', `${indexChangeset}\n</databaseChangeLog>`);
              }

              // Ensure the pgvector extension exists before the vector column / table is created.
              // Dev/prod get it from the postgres init script; tests (Testcontainers) have no init
              // script, so the extension must be created via Liquibase or the vector(n) column DDL
              // fails with "type \"vector\" does not exist". Idempotent (IF NOT EXISTS) and inserted
              // before the first changeSet so it runs ahead of createTable.
              if (!content.includes('CREATE EXTENSION IF NOT EXISTS vector')) {
                const extChangeset =
                  `    <changeSet id="${entity.changelogDate}-create-vector-extension" author="jhipster">\n` +
                  `        <sql>CREATE EXTENSION IF NOT EXISTS vector</sql>\n` +
                  `    </changeSet>\n`;
                content = content.replace(/(\r?\n)(\s*)<changeSet /, `$1${extChangeset}$2<changeSet `);
              }

              this.fs.write(changelogPath, content);
              this.log.info(`[sql-spring-boot] Patched Liquibase changelog: ${file}`);
            } catch (e) {
              this.log.warn(`[sql-spring-boot] Failed to patch changelog ${file}: ${e.message}`);
            }
          }
        }

        // Saathratri modification - Generate Liquibase indexes for @customQueryAnnotation with 'index' flag
        for (const entity of entities.filter(e => !e.builtIn && !e.skipServer)) {
          // JHipster 9 spreads annotations onto entity object, so check both locations
          const customQueryAnnotations = entity.customQueryAnnotation ?? entity.annotations?.customQueryAnnotation;
          const customQueryRawArr = customQueryAnnotations
            ? Array.isArray(customQueryAnnotations)
              ? customQueryAnnotations
              : [customQueryAnnotations]
            : [];
          // Support pipe-delimited multiple queries within a single annotation value
          const customQueryDirectives = customQueryRawArr.flatMap(d =>
            typeof d === 'string'
              ? d
                  .split('|')
                  .map(s => s.trim())
                  .filter(Boolean)
              : [d],
          );

          const indexDirectives = [];
          for (const directive of customQueryDirectives) {
            if (typeof directive !== 'string') continue;
            const colonIdx = directive.indexOf(':');
            if (colonIdx < 0) continue;
            const methodName = directive.substring(0, colonIdx).trim();
            const rest = directive.substring(colonIdx + 1).trim();
            if (!/\bindex\b/.test(rest)) continue;
            const paramsMatch = rest.match(/params\s*\[\s*([^\]]*)\s*\]/);
            const params = paramsMatch
              ? paramsMatch[1]
                  .split(',')
                  .map(p => p.trim())
                  .filter(Boolean)
              : [];
            if (params.length === 0) continue;

            // Convert camelCase to snake_case for database column names
            const toSnakeCase = str =>
              str
                .replace(/([A-Z])/g, '_$1')
                .toLowerCase()
                .replace(/^_/, '');
            const columnNames = params.map(paramName => {
              const field = entity.fields.find(f => f.fieldName === paramName);
              return field ? field.fieldNameAsDatabaseColumn || field.columnName || toSnakeCase(paramName) : toSnakeCase(paramName);
            });

            indexDirectives.push({ methodName, columnNames });
          }

          this.log.info(
            `[sql-spring-boot] Custom query index check for ${entity.entityClass}: found ${indexDirectives.length} index directives from ${customQueryDirectives.length} queries`,
          );
          if (indexDirectives.length === 0) continue;

          const fs = await import('fs');
          const changelogDir = this.destinationPath('src/main/resources/config/liquibase/changelog');
          let changelogFiles = [];
          try {
            const suffix = `_added_entity_${entity.entityClass}.xml`;
            changelogFiles = fs.readdirSync(changelogDir).filter(f => f.endsWith(suffix));
          } catch {
            /* ignore */
          }

          for (const file of changelogFiles) {
            const changelogPath = this.destinationPath(`src/main/resources/config/liquibase/changelog/${file}`);
            try {
              let content = this.fs.read(changelogPath);
              if (!content) continue;

              for (const idx of indexDirectives) {
                const indexName = `idx_${entity.entityTableName}_${idx.columnNames.join('_')}`;
                if (content.includes(indexName)) continue;

                const indexChangeset = `
    <changeSet id="${entity.changelogDate}-custom-idx-${idx.methodName}" author="jhipster">
        <createIndex indexName="${indexName}" tableName="${entity.entityTableName}">
${idx.columnNames.map(col => `            <column name="${col}"/>`).join('\n')}
        </createIndex>
    </changeSet>`;

                content = content.replace('</databaseChangeLog>', `${indexChangeset}\n</databaseChangeLog>`);
              }

              this.fs.write(changelogPath, content);
              this.log.info(`[sql-spring-boot] Added custom query indexes to Liquibase changelog: ${file}`);
            } catch (e) {
              this.log.warn(`[sql-spring-boot] Failed to add indexes to changelog ${file}: ${e.message}`);
            }
          }
        }
        // End Saathratri modification

        // NOTE: @Type(PgVectorType.class) for vector fields is handled by the fragment template:
        // templates/src/main/java/_package_/_entityPackage_/domain/_persistClass_.java.jhi.pgvector_type.ejs
        // JHipster's fragment merging automatically includes it in the entity domain class.

        // Patch ExceptionTranslator to log stacktraces at ERROR level
        const exceptionTranslatorFile = `src/main/java/${packageFolder}/web/rest/errors/ExceptionTranslator.java`;
        this.editFile(exceptionTranslatorFile, content => {
          return content.replace(
            'LOG.debug("Converting Exception to Problem Details:", ex);',
            'LOG.error("Unhandled exception caught by ExceptionTranslator:", ex);',
          );
        });

        // Saathratri modification - honor @entityGraphIncludeNestedCustomAnnotation.
        // Format: "methodA: [ a.b, c.d ] | methodB: [ x.y ]"
        // For each directive, append the nested dot-paths to the matching
        // @EntityGraph(attributePaths = { ... }) method in <Entity>Repository.java.
        // Purpose: kill N+1 SELECTs on inverse @OneToOne by eager-joining them.
        for (const entity of entities.filter(e => !e.builtIn && !e.skipServer)) {
          const nestedAnno =
            entity.entityGraphIncludeNestedCustomAnnotation ?? entity.annotations?.entityGraphIncludeNestedCustomAnnotation;
          if (typeof nestedAnno !== 'string' || !nestedAnno.trim()) continue;

          const directives = nestedAnno
            .split('|')
            .map(s => s.trim())
            .filter(Boolean);
          if (!directives.length) continue;

          const repoFile = `src/main/java/${packageFolder}/repository/${entity.entityClass}Repository.java`;
          this.editFile(repoFile, content => {
            if (typeof content !== 'string' || !content) return content;

            let touched = 0;
            for (const directive of directives) {
              const colonIdx = directive.indexOf(':');
              if (colonIdx < 0) continue;
              const methodName = directive.substring(0, colonIdx).trim();
              const bracketMatch = directive.substring(colonIdx + 1).match(/\[\s*([^\]]+?)\s*\]/);
              if (!methodName || !bracketMatch) continue;

              const nestedPaths = bracketMatch[1]
                .split(',')
                .map(s => s.trim().replace(/^["']|["']$/g, ''))
                .filter(Boolean);
              if (!nestedPaths.length) continue;

              // Find the @EntityGraph ... method. Anchor on the method name so
              // we patch just the right one. `[^}]*?` keeps the match LOCAL to
              // a single @EntityGraph block - the attributePaths list never
              // contains a `}`, so this can't straddle across methods.
              const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const methodRx = new RegExp(
                `(@EntityGraph\\(\\s*attributePaths\\s*=\\s*\\{)([^}]*?)(\\s*\\}\\s*\\)\\s*(?:\\r?\\n\\s*)*Optional<${esc(
                  entity.entityClass,
                )}>\\s+${esc(methodName)}\\b)`,
              );
              const m = content.match(methodRx);
              if (!m) {
                this.log.info(
                  `[sql-spring-boot] entityGraphIncludeNestedCustomAnnotation: no @EntityGraph for ${entity.entityClass}.${methodName}(), skipping`,
                );
                continue;
              }
              const existingList = m[2];
              // Filter out any nested path whose literal "path" is already
              // present; we don't want duplicates on repeated regens.
              const existingSet = new Set(
                existingList
                  .split(',')
                  .map(s => s.trim().replace(/^["']|["']$/g, ''))
                  .filter(Boolean),
              );
              const toAdd = nestedPaths.filter(p => !existingSet.has(p));
              if (!toAdd.length) continue;

              // Preserve the trailing comma convention used by JHipster
              // (existing entries usually end with a trailing comma).
              const trimmedExisting = existingList.replace(/\s+$/, '');
              const needsComma = !trimmedExisting.endsWith(',');
              const insert = `${needsComma ? ',' : ''}\n            ${toAdd.map(p => `"${p}"`).join(',\n            ')},\n        `;
              const newList = trimmedExisting + insert;
              content = content.replace(methodRx, `$1${newList}$3`);
              touched += toAdd.length;
            }
            if (touched > 0) {
              this.log.info(`[sql-spring-boot] Added ${touched} nested attributePath(s) to ${entity.entityClass}Repository.java`);
            }
            return content;
          });
        }
      },

      async injectLazyRelationshipReadEndpoints({ application, entities }) {
        // For each entity annotated with `entityGraphExcludeCustomAnnotation`,
        // inject a pair of READ endpoints per excluded relationship into the
        // already-generated Resource.java + ServiceImpl.java + Service.java.
        //
        //   GET /api/{resource}/{id}/{field}?page=&size=&search=  -> paginated DTOs
        //   GET /api/{resource}/{id}/{field}/ids                  -> List<id>
        //
        // The endpoints back the admin UI's lazy-load popups so each excluded
        // collection is fetched on demand instead of paying the full-graph cost
        // on every detail/edit page hit. This block is intentionally read-only
        // — the matching PUT (bulk-replace, with inverse-side ManyToMany
        // reconciliation) lands in a follow-up session along with the edit
        // popup component.
        //
        // Scope guards (in order):
        //   1. SQL apps only (this generator already filters non-SQL out of
        //      WRITING, but POST_WRITING_ENTITIES still fires for them).
        //   2. Microservices only (the gateway forwards entity API calls).
        //   3. Entities that actually carry the annotation; everything else is
        //      left exactly as upstream wrote it.
        //
        // For each excluded relationship we currently only handle the
        // ManyToMany INVERSE side (the case TajOrganization uses). Other shapes
        // (owning-side MtM, OneToMany, ManyToOne) are logged + skipped so the
        // generator still completes cleanly; they can be filled in incrementally
        // as the corresponding entities adopt the annotation.
        if (!application.databaseTypeSql || !application.applicationTypeMicroservice) {
          return;
        }

        const packageFolder = (
          application.packageFolder ??
          (application.packageName ? `${application.packageName.replace(/\./g, '/')}/` : undefined) ??
          ''
        ).replace(/\/+$/, '');
        const { packageName } = application;
        if (!packageFolder || !packageName) {
          this.log.warn('[sql-spring-boot] injectLazyRelationshipReadEndpoints: package metadata unavailable, skipping');
          return;
        }

        const MARKER = 'SAATHRATRI: lazy-load excluded-relationship endpoints';
        let touchedEntities = 0;

        for (const entity of entities) {
          if (entity.builtIn || entity.skipServer) continue;
          const excluded = getExcludedRelationships(entity);
          if (!excluded.length) continue;

          const { entityClass } = entity;
          const { entityInstance } = entity;
          const idType = entity.primaryKey?.type || 'UUID';
          const resourcePath = `src/main/java/${packageFolder}/web/rest/${entityClass}Resource.java`;
          const serviceImplPath = `src/main/java/${packageFolder}/service/impl/${entityClass}ServiceImpl.java`;
          const serviceIntfPath = `src/main/java/${packageFolder}/service/${entityClass}Service.java`;

          // Build per-relationship metadata once so each file edit just
          // concatenates blocks; missing/unsupported peers are filtered here.
          const blocks = [];
          for (const rel of excluded) {
            const meta = describeExcludedRelationship(entity, rel, entities);
            if (!meta) {
              this.log.warn(`[sql-spring-boot] lazy-load: ${entityClass}.${rel.relationshipName} -> peer entity not found, skipping`);
              continue;
            }
            if (meta.relationshipType !== 'many-to-many' || !meta.isInverseSide) {
              this.log.warn(
                `[sql-spring-boot] lazy-load: ${entityClass}.${meta.fieldName} (${meta.relationshipType}, ${meta.isInverseSide ? 'inverse' : 'owning'}) ` +
                  'is not yet supported by the lazy-load helper; only inverse ManyToMany is wired in this session. Skipping.',
              );
              continue;
            }
            if (!meta.otherEntityFieldOnOwner) {
              this.log.warn(
                `[sql-spring-boot] lazy-load: ${entityClass}.${meta.fieldName} -> could not resolve owning-side field name on ${meta.otherEntityClass}, skipping`,
              );
              continue;
            }
            blocks.push(meta);
          }
          if (!blocks.length) continue;

          const ensureImport = (src, fqn) => {
            if (src.includes(`import ${fqn};`)) return src;
            // Java files start with `package ...;` on line 1 (no leading newline).
            // mem-fs buffers on Windows can be CRLF even when the on-disk file is LF.
            const re = /^(package [^;]+;\r?\n)/m;
            if (!re.test(src)) {
              throw new Error(`[sql-spring-boot] lazy-load: cannot find package declaration to insert import "${fqn}" after`);
            }
            return src.replace(re, (_, m) => `${m}import ${fqn};\n`);
          };

          // ---- Resource.java ---------------------------------------------------
          this.editFile(resourcePath, content => {
            if (typeof content !== 'string' || content.includes(MARKER)) return content;
            for (const fqn of [
              'java.util.List',
              'java.util.Set',
              'org.springframework.data.domain.Page',
              'org.springframework.data.domain.Pageable',
              'org.springframework.http.HttpHeaders',
              'org.springframework.http.ResponseEntity',
              'org.springframework.web.bind.annotation.GetMapping',
              'org.springframework.web.bind.annotation.PathVariable',
              'org.springframework.web.bind.annotation.PutMapping',
              'org.springframework.web.bind.annotation.RequestBody',
              'org.springframework.web.bind.annotation.RequestParam',
              'org.springframework.web.servlet.support.ServletUriComponentsBuilder',
              'tech.jhipster.web.util.PaginationUtil',
            ]) {
              content = ensureImport(content, fqn);
            }
            for (const meta of blocks) {
              content = ensureImport(content, `${packageName}.service.dto.${meta.otherEntityDtoClass}`);
            }

            const methods = blocks
              .map(meta => {
                const fld = meta.fieldName;
                const suffix = meta.methodSuffix;
                const dto = meta.otherEntityDtoClass;
                return `
    /**
     * {@code GET  /api/${entity.entityApiUrl}/{id}/${fld}} : lazy-load excluded relationship "${fld}" (paginated, with optional search).
     */
    @GetMapping("/{id}/${fld}")
    public ResponseEntity<List<${dto}>> get${entityClass}${suffix}(
        @PathVariable("id") ${idType} id,
        @org.springdoc.core.annotations.ParameterObject Pageable pageable,
        @RequestParam(value = "search", required = false) String search
    ) {
        LOG.debug("REST request to lazy-load ${fld} of ${entityClass} {} (search={})", id, search);
        Page<${dto}> page = ${entityInstance}Service.get${entityClass}${suffix}(id, search, pageable);
        HttpHeaders headers = PaginationUtil.generatePaginationHttpHeaders(ServletUriComponentsBuilder.fromCurrentRequest(), page);
        return ResponseEntity.ok().headers(headers).body(page.getContent());
    }

    /**
     * {@code GET  /api/${entity.entityApiUrl}/{id}/${fld}/ids} : lazy-load IDs of "${fld}" for the edit popup's pre-selection.
     */
    @GetMapping("/{id}/${fld}/ids")
    public ResponseEntity<List<${idType}>> get${entityClass}${suffix}Ids(@PathVariable("id") ${idType} id) {
        return ResponseEntity.ok(${entityInstance}Service.get${entityClass}${suffix}Ids(id));
    }

    /**
     * {@code GET  /api/${entity.entityApiUrl}/{id}/${fld}/candidates} : paginated list of ALL peer
     * entities of this relationship's type (membership-agnostic). Used by the edit popup to
     * present the full candidate set with checkboxes pre-checked for current members.
     */
    @GetMapping("/{id}/${fld}/candidates")
    public ResponseEntity<List<${dto}>> get${entityClass}${suffix}Candidates(
        @PathVariable("id") ${idType} id,
        @org.springdoc.core.annotations.ParameterObject Pageable pageable,
        @RequestParam(value = "search", required = false) String search
    ) {
        LOG.debug("REST request to list candidates for ${fld} of ${entityClass} {} (search={})", id, search);
        Page<${dto}> page = ${entityInstance}Service.get${entityClass}${suffix}Candidates(search, pageable);
        HttpHeaders headers = PaginationUtil.generatePaginationHttpHeaders(ServletUriComponentsBuilder.fromCurrentRequest(), page);
        return ResponseEntity.ok().headers(headers).body(page.getContent());
    }

    /**
     * {@code PUT  /api/${entity.entityApiUrl}/{id}/${fld}} : bulk-replace the membership of "${fld}".
     * Body is a JSON array of peer IDs that should be the new membership set; the server
     * diffs against current state and reconciles each addition/removal individually
     * (peers' owning-side collections are the source of truth for inverse-MtM).
     */
    @PutMapping("/{id}/${fld}")
    public ResponseEntity<Void> set${entityClass}${suffix}(
        @PathVariable("id") ${idType} id,
        @RequestBody Set<${idType}> peerIds
    ) {
        LOG.debug("REST request to bulk-replace ${fld} of ${entityClass} {} with {} peer ids", id, peerIds == null ? 0 : peerIds.size());
        ${entityInstance}Service.set${entityClass}${suffix}(id, peerIds == null ? java.util.Set.of() : peerIds);
        return ResponseEntity.noContent().build();
    }`;
              })
              .join('\n');

            const block = `\n    // ---- ${MARKER} ----\n${methods}\n    // ---- end ${MARKER} ----\n`;
            const lastBraceIdx = content.lastIndexOf('}');
            if (lastBraceIdx < 0) return content;
            return content.slice(0, lastBraceIdx) + block + content.slice(lastBraceIdx);
          });

          // ---- ServiceImpl.java -----------------------------------------------
          this.editFile(serviceImplPath, content => {
            if (typeof content !== 'string' || content.includes(MARKER)) return content;
            for (const fqn of [
              'java.util.HashSet',
              'java.util.List',
              'java.util.Set',
              'java.util.stream.Collectors',
              'org.springframework.data.domain.Page',
              'org.springframework.data.domain.PageImpl',
              'org.springframework.data.domain.Pageable',
              'jakarta.persistence.EntityManager',
              'jakarta.persistence.PersistenceContext',
            ]) {
              content = ensureImport(content, fqn);
            }
            for (const meta of blocks) {
              content = ensureImport(content, `${packageName}.domain.${meta.otherEntityClass}`);
              content = ensureImport(content, `${packageName}.service.dto.${meta.otherEntityDtoClass}`);
              content = ensureImport(content, `${packageName}.service.mapper.${meta.otherEntityClass}Mapper`);
            }
            // Parent entity import too — the bulk-replace method needs to load it
            // by id so it can be added/removed from each peer's owning-side collection.
            content = ensureImport(content, `${packageName}.domain.${entityClass}`);

            const fields =
              `\n    // ${MARKER} (fields)\n` +
              `    @PersistenceContext\n    private EntityManager lazyEntityManager;\n${blocks
                .map(
                  meta =>
                    `    @org.springframework.beans.factory.annotation.Autowired private ${meta.otherEntityClass}Mapper lazy${meta.methodSuffix}Mapper;`,
                )
                .join('\n')}\n`;

            const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
            const methods = blocks
              .map(meta => {
                const suffix = meta.methodSuffix;
                const other = meta.otherEntityClass;
                const dto = meta.otherEntityDtoClass;
                const ownerField = meta.otherEntityFieldOnOwner;
                const ownerFieldGetter = cap(ownerField);
                const labelField = meta.displayLabelField;
                const labelPath = meta.displayLabelPath;

                // Three search modes:
                //   - 'path'  : entity-level @displayInGuiRelationshipLinkPathCustomAnnotation
                //               Join through each unique relation, OR across each leaf field.
                //   - 'field' : peer field tagged with DISPLAY_IN_GUI_RELATIONSHIP_LINK.
                //   - 'uuid'  : neither set; fall back to substring-match on stringified id
                //               so the search box still does something useful.
                // Search is always supported now — the upstream UI surfaces the search box
                // for every popup, so a "search arg silently ignored" mode would just confuse.
                let pathJoins = '';
                let searchFrag;
                let labelComment;
                if (Array.isArray(labelPath) && labelPath.length) {
                  const uniqueRels = [...new Set(labelPath.map(p => p[0]))];
                  pathJoins = ` ${uniqueRels.map(r => `LEFT JOIN child.${r} child${cap(r)}`).join(' ')}`;
                  const orClauses = labelPath.map(
                    ([rel, fld]) => `LOWER(CAST(child${cap(rel)}.${fld} AS string)) LIKE LOWER(CONCAT('%', :search, '%'))`,
                  );
                  searchFrag = orClauses.length === 1 ? orClauses[0] : `(${orClauses.join(' OR ')})`;
                  labelComment = `// search filters on peer's display-path: ${labelPath.map(p => p.join('.')).join(', ')}`;
                } else if (labelField) {
                  searchFrag = `LOWER(CAST(child.${labelField} AS string)) LIKE LOWER(CONCAT('%', :search, '%'))`;
                  labelComment = `// search filters on peer's DISPLAY_IN_GUI_RELATIONSHIP_LINK field "${labelField}"`;
                } else {
                  searchFrag = `LOWER(CAST(child.id AS string)) LIKE LOWER(CONCAT('%', :search, '%'))`;
                  labelComment = `// no display label on peer ${other}; search filters on stringified id (UUID fallback)`;
                }
                const bindSearchLine = `if (search != null && !search.isBlank()) { listQuery.setParameter("search", search); countQuery.setParameter("search", search); }`;
                return `
    /** ${MARKER}: paginated, optionally search-filtered lookup of "${meta.fieldName}". */
    @Override
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public Page<${dto}> get${entityClass}${suffix}(${idType} id, String search, Pageable pageable) {
        ${labelComment}
        String baseFrom = "FROM ${other} child JOIN child.${ownerField} parent${pathJoins} WHERE parent.id = :id";
        String searchClause = (search != null && !search.isBlank()) ? " AND ${searchFrag}" : "";
        jakarta.persistence.TypedQuery<${other}> listQuery = lazyEntityManager
            .createQuery("SELECT child " + baseFrom + searchClause + " ORDER BY child.id ASC", ${other}.class)
            .setParameter("id", id);
        jakarta.persistence.TypedQuery<Long> countQuery = lazyEntityManager
            .createQuery("SELECT COUNT(child) " + baseFrom + searchClause, Long.class)
            .setParameter("id", id);
        ${bindSearchLine}
        long total = countQuery.getSingleResult();
        if (total == 0L) {
            return Page.empty(pageable);
        }
        List<${other}> rows = listQuery
            .setFirstResult((int) pageable.getOffset())
            .setMaxResults(pageable.getPageSize())
            .getResultList();
        List<${dto}> dtos = rows.stream().map(lazy${suffix}Mapper::toDto).collect(Collectors.toList());
        return new PageImpl<>(dtos, pageable, total);
    }

    /** ${MARKER}: paginated list of all peer ${other}s for the edit-popup candidate picker. */
    @Override
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public Page<${dto}> get${entityClass}${suffix}Candidates(String search, Pageable pageable) {
        ${labelComment}
        String baseFrom = "FROM ${other} child${pathJoins}";
        String searchClause = (search != null && !search.isBlank()) ? " WHERE ${searchFrag}" : "";
        jakarta.persistence.TypedQuery<${other}> listQuery = lazyEntityManager
            .createQuery("SELECT child " + baseFrom + searchClause + " ORDER BY child.id ASC", ${other}.class);
        jakarta.persistence.TypedQuery<Long> countQuery = lazyEntityManager
            .createQuery("SELECT COUNT(child) " + baseFrom + searchClause, Long.class);
        ${bindSearchLine}
        long total = countQuery.getSingleResult();
        if (total == 0L) {
            return Page.empty(pageable);
        }
        List<${other}> rows = listQuery
            .setFirstResult((int) pageable.getOffset())
            .setMaxResults(pageable.getPageSize())
            .getResultList();
        List<${dto}> dtos = rows.stream().map(lazy${suffix}Mapper::toDto).collect(Collectors.toList());
        return new PageImpl<>(dtos, pageable, total);
    }

    /** ${MARKER}: id-only lookup of "${meta.fieldName}" for edit-popup pre-selection. */
    @Override
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<${idType}> get${entityClass}${suffix}Ids(${idType} id) {
        return lazyEntityManager
            .createQuery(
                "SELECT child.id FROM ${other} child JOIN child.${ownerField} parent WHERE parent.id = :id ORDER BY child.id ASC",
                ${idType}.class
            )
            .setParameter("id", id)
            .getResultList();
    }

    /**
     * ${MARKER}: bulk-replace the "${meta.fieldName}" membership for the given parent.
     *
     * For inverse-side ManyToMany the join table is owned by the peer's "${ownerField}"
     * collection, so we load each affected peer and add/remove the parent from its
     * collection. Diff-based to keep the work minimal when most of the membership
     * is unchanged. All updates run inside a single @Transactional block so a
     * partial failure rolls everything back.
     */
    @Override
    @org.springframework.transaction.annotation.Transactional
    public void set${entityClass}${suffix}(${idType} id, Set<${idType}> newPeerIds) {
        ${entityClass} parent = lazyEntityManager.find(${entityClass}.class, id);
        if (parent == null) {
            throw new IllegalArgumentException("${entityClass} not found: " + id);
        }
        Set<${idType}> targetIds = newPeerIds == null ? new HashSet<>() : new HashSet<>(newPeerIds);
        Set<${idType}> currentIds = new HashSet<>(get${entityClass}${suffix}Ids(id));

        Set<${idType}> toAdd = new HashSet<>(targetIds);
        toAdd.removeAll(currentIds);
        Set<${idType}> toRemove = new HashSet<>(currentIds);
        toRemove.removeAll(targetIds);

        for (${idType} peerId : toAdd) {
            ${other} peer = lazyEntityManager.find(${other}.class, peerId);
            if (peer != null) {
                peer.get${ownerFieldGetter}().add(parent);
                lazyEntityManager.merge(peer);
            }
        }
        for (${idType} peerId : toRemove) {
            ${other} peer = lazyEntityManager.find(${other}.class, peerId);
            if (peer != null) {
                peer.get${ownerFieldGetter}().remove(parent);
                lazyEntityManager.merge(peer);
            }
        }
    }`;
              })
              .join('\n');

            const block = `\n    // ---- ${MARKER} ----\n${fields}${methods}\n    // ---- end ${MARKER} ----\n`;
            const lastBraceIdx = content.lastIndexOf('}');
            if (lastBraceIdx < 0) return content;
            return content.slice(0, lastBraceIdx) + block + content.slice(lastBraceIdx);
          });

          // ---- Service.java (interface) ---------------------------------------
          this.editFile(serviceIntfPath, content => {
            if (typeof content !== 'string' || content.includes(MARKER)) return content;
            for (const fqn of [
              'java.util.List',
              'java.util.Set',
              'org.springframework.data.domain.Page',
              'org.springframework.data.domain.Pageable',
            ]) {
              content = ensureImport(content, fqn);
            }
            for (const meta of blocks) {
              content = ensureImport(content, `${packageName}.service.dto.${meta.otherEntityDtoClass}`);
            }

            const sigs = blocks
              .map(meta => {
                const suffix = meta.methodSuffix;
                const dto = meta.otherEntityDtoClass;
                return `
    /** ${MARKER}: paginated, optionally search-filtered lookup of "${meta.fieldName}". */
    Page<${dto}> get${entityClass}${suffix}(${idType} id, String search, Pageable pageable);

    /** ${MARKER}: paginated list of all peer ${dto}s (membership-agnostic) for the edit-popup picker. */
    Page<${dto}> get${entityClass}${suffix}Candidates(String search, Pageable pageable);

    /** ${MARKER}: id-only lookup of "${meta.fieldName}" for edit-popup pre-selection. */
    List<${idType}> get${entityClass}${suffix}Ids(${idType} id);

    /** ${MARKER}: bulk-replace "${meta.fieldName}" membership; reconciles each affected peer's owning-side collection. */
    void set${entityClass}${suffix}(${idType} id, Set<${idType}> peerIds);`;
              })
              .join('\n');

            const block = `\n    // ---- ${MARKER} ----\n${sigs}\n    // ---- end ${MARKER} ----\n`;
            const lastBraceIdx = content.lastIndexOf('}');
            if (lastBraceIdx < 0) return content;
            return content.slice(0, lastBraceIdx) + block + content.slice(lastBraceIdx);
          });

          touchedEntities += 1;
        }

        if (touchedEntities > 0) {
          this.log.ok(
            `[sql-spring-boot] lazy-load: injected READ endpoints for ${touchedEntities} entit${touchedEntities === 1 ? 'y' : 'ies'} in ${application.baseName}`,
          );
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
