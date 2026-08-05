import BaseApplicationGenerator from 'generator-jhipster/generators/base-application';

import { languagesSaathratriUtils } from '../../cassandra-client-utils.js';

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
            files: [{ templates: ['template-file-cassandra-client-i18n'] }],
          },
          context: application,
        });

        await this.writeFiles({
          sections: {
            files: [
              {
                condition: generator => generator.databaseTypeCassandra,
                templates: [
                  {
                    sourceFile: `src/main/webapp/i18n/en/global.json.ejs`,
                    destinationFile: `${application.clientSrcDir}i18n/en/global.json`,
                  },
                ],
              },
            ],
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
                  condition: generator => !generator.embedded && generator.databaseTypeCassandra && !entity.skipClient,
                  templates: [
                    {
                      sourceFile: `entity/i18n/entity_en.json.ejs`,
                      destinationFile: `${application.clientSrcDir}i18n/en/${entity.entityTranslationKey}.json`,
                    },
                  ],
                },
              ],
            },
            context: { ...application, ...entity, ...languagesSaathratriUtils },
          });
        }
      },
    });
  }
}
