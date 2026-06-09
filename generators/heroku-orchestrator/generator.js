import BaseApplicationGenerator from 'generator-jhipster/generators/base-application';
import command from './command.js';
import { herokuSaathratriUtils } from './heroku-saathratri-utils.js';

export default class extends BaseApplicationGenerator {
  constructor(args, opts, features) {
    super(args, opts, { ...features, sbsBlueprint: true });
  }

  get [BaseApplicationGenerator.INITIALIZING]() {
    return this.asInitializingTaskGroup({
      async initializingTemplateTask() {
      },
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
      async preparingEachEntityTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.PREPARING_EACH_ENTITY_FIELD]() {
    return this.asPreparingEachEntityFieldTaskGroup({
      async preparingEachEntityFieldTemplateTask() {},
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
        
        this.includeServerFiles();

        await this.writeFiles({
          sections: {
            files: [
              {
                condition: generator => (generator.applicationTypeMicroservice || generator.applicationTypeGateway),
                path: './',
                templates: [ 'template-file-heroku-orchestrator', 'Procfile', 'system.properties', '.slugignore' ],
              },
              {
                condition: generator => (generator.applicationTypeMicroservice || generator.applicationTypeGateway),
                path: './src/main/resources/config/',
                templates: [ 'application-heroku.yml', 'bootstrap-heroku.yml' ],
              }
            ],
          },
          context: { ...application, ...herokuSaathratriUtils },
        });
      },
    });
  }

  get [BaseApplicationGenerator.WRITING_ENTITIES]() {
    return this.asWritingEntitiesTaskGroup({
      async writingEntitiesTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.POST_WRITING]() {
    return this.asPostWritingTaskGroup({
      async postWritingTemplateTask({ application }) {
        // Define a `heroku` Maven profile in pom.xml, co-located with the heroku
        // yml/Procfile generation above (same microservice/gateway condition), so a
        // single submodule owns every Heroku artifact. Follows JHipster's additive
        // profile convention (like `tls`): adds a `heroku` profile and appends
        // ${profile.heroku} to the prod profile's spring.profiles.active, so a
        // `-Pprod,heroku` build bakes spring.profiles.active=prod,heroku into the jar
        // and application-heroku.yml is active at runtime. Idempotent (skipped if a
        // heroku profile already exists).
        if ((application.applicationTypeMicroservice || application.applicationTypeGateway) && application.buildToolMaven) {
          this.editFile('pom.xml', content => {
            if (!content.includes('<id>heroku</id>')) {
              content = content.replace(
                '        <profile.tls/>\n',
                '        <profile.tls/>\n        <profile.heroku/>\n'
              );
              content = content.replace(
                '            <id>tls</id>\n' +
                  '            <properties>\n' +
                  '                <profile.tls>,tls</profile.tls>\n' +
                  '            </properties>\n' +
                  '        </profile>\n',
                '            <id>tls</id>\n' +
                  '            <properties>\n' +
                  '                <profile.tls>,tls</profile.tls>\n' +
                  '            </properties>\n' +
                  '        </profile>\n' +
                  '        <profile>\n' +
                  '            <id>heroku</id>\n' +
                  '            <properties>\n' +
                  '                <profile.heroku>,heroku</profile.heroku>\n' +
                  '            </properties>\n' +
                  '        </profile>\n'
              );
              content = content.replace(
                /(<spring\.profiles\.active>prod[^<]*?)(<\/spring\.profiles\.active>)/,
                (m, p1, p2) => p1 + '${profile.heroku}' + p2
              );
              this.log.info('[heroku-orchestrator] Added `heroku` Maven profile to pom.xml');
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

  includeServerFiles() {
    // // Logic to skip server files
    // this.log('Skipping server files...');
    // // Customize this method to skip specific server files
    // this.serverFiles = this.serverFiles?.filter( file  =>
    //   file.startsWith('Procfile') &&
    //   file.startWith('.slugignore') &&
    //   file.startWith('system.properties')
    // );
  }
}
