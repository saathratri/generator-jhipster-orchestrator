import BaseApplicationGenerator from 'generator-jhipster/generators/base-application';
import { javaMainPackageTemplatesBlock, javaTestPackageTemplatesBlock } from 'generator-jhipster/generators/java/support';
import { snakeCase } from 'lodash-es';

import { javaSaathratriUtils } from '../cassandra-java/generators/domain/cassandra-java-domain-utils.js';

import { cassandraSpringBootUtils } from './cassandra-spring-boot-utils.js';
import { springDataCassandraSaathratriUtils } from './generators/data-cassandra/cassandra-spring-data-cassandra-utils.js';

export default class extends BaseApplicationGenerator {
  constructor(args, opts, features) {
    /******************************************************************/
    // Important: The checkBlueprint: true flag is used to check if the
    // blueprint is installed and uses it to process the generator.
    // The base generator is called where the properties are defined.
    /******************************************************************/
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
      async composeTask() {
        if (['cassandra'].includes(this.jhipsterConfigWithDefaults.databaseType)) {
          // Delegate to the data-cassandra sub-generator.
          await this.composeWith('./generators/data-cassandra/index.js');
        }
      },
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
        cassandraSpringBootUtils.setSaathratriPrimaryKeyAttributesOnEntityAndFields(entity);
        // Override entityTableName to use lodash snakeCase which correctly
        // inserts underscores before trailing digits (e.g. SaathratriEntity2 → saathratri_entity_2).
        // JHipster's default hibernateSnakeCase skips the last character transition.
        entity.entityTableName = snakeCase(entity.entityInstance);
      },
    });
  }

  get [BaseApplicationGenerator.PREPARING_EACH_ENTITY_FIELD]() {
    return this.asPreparingEachEntityFieldTaskGroup({
      async preparingEachEntityFieldTemplateTask({ entity, field, application }) {
        // Detect vector fields annotated with @customAnnotation("VECTOR")
        const annotation = field.options?.customAnnotation?.[0];
        if (annotation === 'VECTOR') {
          const vectorDimension = field.options?.customAnnotation?.[1] || '1536';
          const sourceFieldName = field.fieldName.replace(/Embedding$/, '');
          const sourceFieldNameCapitalized = sourceFieldName.charAt(0).toUpperCase() + sourceFieldName.slice(1);

          field.fieldTypeVectorSaathratri = true;
          field.vectorDimensionSaathratri = vectorDimension;
          field.sourceFieldNameSaathratri = sourceFieldName;
          field.sourceFieldNameCapitalizedSaathratri = sourceFieldNameCapitalized;

          // Set proper Java type for vector fields
          field.javaFieldType = 'CqlVector<Float>';

          // Hide vector fields from Angular UI (they are internal embeddings)
          field.hidden = true;

          // Override blob flags since vector fields are not blobs
          field.fieldTypeBytes = false;
          field.fieldWithContentType = false;
          field.fieldTypeBinary = false;
          field.blobContentTypeText = false;
          field.blobContentTypeAny = false;
          field.blobContentTypeImage = false;
          field.fieldTypeBlobContent = undefined;
          field.fieldTypeBlob = false;

          // Track vector fields at application level
          application.hasVectorFieldsSaathratri = true;
          if (!application.vectorEntitiesSaathratri) {
            application.vectorEntitiesSaathratri = [];
          }
          if (!application.vectorEntitiesSaathratri.includes(entity.entityClass)) {
            application.vectorEntitiesSaathratri.push(entity.entityClass);
          }
        }
      },
    });
  }

  get [BaseApplicationGenerator.POST_PREPARING_EACH_ENTITY]() {
    return this.asPostPreparingEachEntityTaskGroup({
      async postPreparingEachEntityTemplateTask({ entity }) {
        cassandraSpringBootUtils.setSaathratriNonPrimaryKeySampleValues(entity);
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
        await this.writeFiles({
          sections: {
            files: [{ templates: ['template-file-cassandra-spring-boot'] }],
          },
          context: application,
        });

        if (application.databaseTypeCassandra) {
          let nativeTransportCqlPort = 9042; // Default port for gateway/monolith

          if (application.applicationTypeMicroservice) {
            cassandraSpringBootUtils.getApplicationPortData(this.destinationPath(), this.appname);

            // Increment the last used port and set it in the port data
            const portData = cassandraSpringBootUtils.incrementAndSetLastUsedPort(this.destinationPath(), this.appname);

            // Usage of the ports in your configuration files
            this.log(`The server ports are: ${JSON.stringify(portData[this.appname])}`);

            ({ nativeTransportCqlPort } = portData[this.appname]);
          }

          await this.writeFiles({
            sections: {
              files: [
                {
                  templates: ['src/main/resources/config/application-dev.yml'],
                },
              ],
            },
            context: {
              ...application,
              nativeTransportCqlPortSaathratri: nativeTransportCqlPort,
            },
          });
        }

        // Write AI/embedding service templates when vector fields are present
        if (application.hasVectorFieldsSaathratri) {
          await this.writeFiles({
            sections: {
              files: [
                {
                  ...javaMainPackageTemplatesBlock(),
                  templates: ['service/embedding/EmbeddingService.java', 'config/EmbeddingConfiguration.java'],
                },
                {
                  ...javaTestPackageTemplatesBlock(),
                  templates: ['service/embedding/EmbeddingServiceTest.java'],
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
        for (const entity of entities.filter(e => !e.builtIn)) {
          await this.writeFiles({
            sections: {
              files: [
                {
                  condition: generator => generator.databaseTypeCassandra && !entity.skipServer,
                  ...javaMainPackageTemplatesBlock('_entityPackage_/'),
                  templates: [
                    'service/_entityClass_Service.java',
                    'service/impl/_entityClass_ServiceImpl.java',
                    'web/rest/_entityClass_Resource.java',
                  ],
                },
                {
                  condition: generator => generator.databaseTypeCassandra && !entity.skipServer,
                  ...javaTestPackageTemplatesBlock('_entityPackage_/'),
                  templates: ['web/rest/_entityClass_ResourceIT.java'],
                },
                {
                  condition: generator => generator.databaseTypeCassandra && !entity.skipServer && entity.primaryKeySaathratri.composite,
                  ...javaMainPackageTemplatesBlock('_entityPackage_/'),
                  templates: [
                    'service/dto/_dtoClass_Id.java',
                    /* saathratri-needle-cassandra-copy-dto-id-class */
                  ],
                },
                {
                  condition: generator => generator.databaseTypeCassandra && !entity.skipServer,
                  ...javaMainPackageTemplatesBlock('_entityPackage_/'),
                  templates: [
                    'service/dto/_dtoClass_.java',
                    /* saathratri-needle-cassandra-copy-dto-class */
                    'service/mapper/_entityClass_Mapper.java',
                  ],
                },
                {
                  condition: generator => generator.databaseTypeCassandra && !entity.skipServer,
                  ...javaTestPackageTemplatesBlock('_entityPackage_/'),
                  templates: ['service/dto/_dtoClass_Test.java'],
                },
              ],
            },
            context: {
              ...application,
              ...entity,
              ...cassandraSpringBootUtils,
              ...springDataCassandraSaathratriUtils,
              ...javaSaathratriUtils,
              ...cassandraSpringBootUtils,
              entityInstanceSnakeCase: snakeCase(entity.entityInstance),
            },
          });
        }
      },
    });
  }

  get [BaseApplicationGenerator.POST_WRITING]() {
    return this.asPostWritingTaskGroup({
      async postWritingTemplateTask({ application }) {
        // Replace the legacy Driver-3 Cluster API calls in the upstream-generated
        // CassandraTestContainersSpringContextCustomizerFactory with Testcontainers'
        // direct accessors. The Driver-3 metadata parse trips on CQL vector<float, N>
        // columns ("Could not parse type name vector<float, 1536>") and the warning
        // would mask real metadata problems in any future vector-dependent IT.
        if (application.databaseTypeCassandra) {
          const customizerPath = `src/test/java/${application.packageFolder}/config/CassandraTestContainersSpringContextCustomizerFactory.java`;
          this.editFile(customizerPath, content => {
            return content
              .replace(
                /cassandraBean\s*\.getCassandraContainer\(\)\s*\.getCluster\(\)[\s\S]*?\.getDatacenter\(\)/g,
                'cassandraBean.getCassandraContainer().getLocalDatacenter()',
              )
              .replace(/cassandraBean\s*\.getCassandraContainer\(\)\s*\.getCluster\(\)[\s\S]*?\.getClusterName\(\)/g, '"Test Cluster"');
          });
        }

        if (!application.hasVectorFieldsSaathratri) return;

        // Add Spring AI BOM and OpenAI dependency to pom.xml
        if (application.buildToolMaven) {
          const pomXmlPath = 'pom.xml';
          this.editFile(pomXmlPath, content => {
            // Add Spring AI OpenAI starter to the main <dependencies> section
            // Match the top-level </dependencies> (4-space indent) to avoid hitting dependencyManagement or profile ones
            if (!content.includes('spring-ai-openai')) {
              // Spring AI 2.0.0 GA's spring-ai-openai brings only openai-java-core; the okhttp
              // transport (com.openai.client.okhttp.OpenAIOkHttpClient, used by EmbeddingConfiguration)
              // must be declared explicitly. Pin to the 4.39.1 line spring-ai-openai:2.0.0 manages.
              // openai-java-core (via both deps) drags in the legacy io.swagger.core.v3:swagger-annotations
              // jar, whose io.swagger.v3.oas.annotations.media.Schema collides with and shadows springdoc's
              // newer swagger-annotations-jakarta, so springdoc's Schema.$dynamicRef() throws
              // NoSuchMethodError and GET /v3/api-docs returns 500. Exclude the legacy jar; the jakarta
              // variant provides the same annotation classes.
              content = content.replace(
                /^( {4})<\/dependencies>/m,
                `$1    <dependency>
$1        <groupId>org.springframework.ai</groupId>
$1        <artifactId>spring-ai-openai</artifactId>
$1        <exclusions>
$1            <exclusion>
$1                <groupId>io.swagger.core.v3</groupId>
$1                <artifactId>swagger-annotations</artifactId>
$1            </exclusion>
$1        </exclusions>
$1    </dependency>
$1    <dependency>
$1        <groupId>com.openai</groupId>
$1        <artifactId>openai-java-client-okhttp</artifactId>
$1        <version>4.39.1</version>
$1        <exclusions>
$1            <exclusion>
$1                <groupId>io.swagger.core.v3</groupId>
$1                <artifactId>swagger-annotations</artifactId>
$1            </exclusion>
$1        </exclusions>
$1    </dependency>
$1</dependencies>`,
              );
            }

            // Add Spring AI BOM inside <dependencyManagement><dependencies>
            if (!content.includes('spring-ai-bom')) {
              content = content.replace(
                /(<\/dependencies>\s*<\/dependencyManagement>)/,
                `    <dependency>
                <groupId>org.springframework.ai</groupId>
                <artifactId>spring-ai-bom</artifactId>
                <version>2.0.0</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        $1`,
              );
            }

            // Add Spring Milestones repository if not present (needed for milestone releases)
            if (!content.includes('spring-milestones')) {
              if (content.includes('</repositories>')) {
                content = content.replace(
                  '</repositories>',
                  `    <repository>
            <id>spring-milestones</id>
            <name>Spring Milestones</name>
            <url>https://repo.spring.io/milestone</url>
        </repository>
    </repositories>`,
                );
              } else {
                // No <repositories> section exists, add one before <profiles> or </project>
                const insertBefore = content.includes('<profiles>') ? '<profiles>' : '</project>';
                content = content.replace(
                  insertBefore,
                  `<repositories>
        <repository>
            <id>spring-milestones</id>
            <name>Spring Milestones</name>
            <url>https://repo.spring.io/milestone</url>
        </repository>
    </repositories>

    ${insertBefore}`,
                );
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
      async postWritingEntitiesTemplateTask() {},
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
