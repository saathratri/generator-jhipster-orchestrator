import BaseApplicationGenerator from 'generator-jhipster/generators/base-application';
import { javaMainPackageTemplatesBlock, javaTestPackageTemplatesBlock } from 'generator-jhipster/generators/java/support';

import { cassandraSpringBootUtils } from '../../../cassandra-spring-boot/cassandra-spring-boot-utils.js';

import { javaSaathratriUtils } from './cassandra-java-domain-utils.js';

export default class extends BaseApplicationGenerator {
  constructor(args, opts, features) {
    super(args, opts, { ...features, sbsBlueprint: true });
  }

  get [BaseApplicationGenerator.INITIALIZING]() {
    return this.asInitializingTaskGroup({
      async initializingTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.WRITING]() {
    return this.asWritingTaskGroup({
      async writingTemplateTask({ application }) {
        await this.writeFiles({
          sections: {
            files: [{ templates: ['template-file-cassandra-java-domain'] }],
          },
          context: application,
        });
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
                  condition: generator => generator.databaseTypeCassandra && !entity.skipServer && entity.primaryKeySaathratri.composite,
                  ...javaMainPackageTemplatesBlock('_entityPackage_/'),
                  templates: ['domain/_persistClass_Id.java'],
                },
                {
                  condition: generator => generator.databaseTypeCassandra && !entity.skipServer,
                  ...javaMainPackageTemplatesBlock('_entityPackage_/'),
                  templates: ['domain/_persistClass_.java.jhi'],
                },
                {
                  condition: generator => generator.databaseTypeCassandra && !entity.skipServer,
                  ...javaTestPackageTemplatesBlock('_entityPackage_/'),
                  templates: [
                    'domain/_persistClass_Asserts.java',
                    'domain/_persistClass_Test.java',
                    'domain/_persistClass_TestSamples.java',
                  ],
                },
              ],
            },
            context: {
              ...application,
              ...entity,
              ...cassandraSpringBootUtils,
              ...javaSaathratriUtils,
            },
          });
        }
      },
    });
  }
}
