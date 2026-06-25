import BaseApplicationGenerator from 'generator-jhipster/generators/base-application';
import {
  clientApplicationTemplatesBlock,
  generateEntityClientEnumImports,
  generateEntityClientFields,
  generateEntityClientImports,
} from 'generator-jhipster/generators/client/support';

import { cassandraSpringBootUtils } from '../cassandra-spring-boot/cassandra-spring-boot-utils.js';

import { angularSaathratriUtils } from './cassandra-angular-utils.js';

export default class extends BaseApplicationGenerator {
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
      },
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
        await this.writeFiles({
          sections: {
            files: [{ templates: ['template-file-cassandra-angular'] }],
          },
          context: application,
        });

        // Skip writing Cassandra-specific shared components for the gateway.
        // The gateway only needs POST_WRITING patches (navbar, package.json, scss).
        // Remote microfrontends bring their own component bundles.
        if (application.applicationTypeGateway) return;

        // Write Cassandra-specific shared components (Material UI, date/time, SET/MAP editors).
        // Overrides for package.json, navbar, global.scss, etc. are applied
        // programmatically in POST_WRITING via editFile() patches.
        await this.writeFiles({
          sections: {
            files: [
              {
                ...clientApplicationTemplatesBlock(),
                templates: [
                  'shared/material.module.ts',
                  'shared/date/convert-from-date-long-to-dayjs.pipe.ts',
                  'shared/date/convert-from-dayjs-to-date-long.pipe.ts',
                  'shared/date/format-utc-date.pipe.ts',
                  'shared/date/saathratri-local-dayjs-and-utc-unix-utils.ts',
                  'shared/date/dayjs-date-adapter.ts',
                  'components/date-time/date-time.component.css',
                  'components/date-time/date-time.component.html',
                  'components/date-time/date-time.component.spec.ts',
                  'components/date-time/date-time.component.ts',
                  'components/set-string-component/set-string-component.component.css',
                  'components/set-string-component/set-string-component.component.html',
                  'components/set-string-component/set-string-component.component.spec.ts',
                  'components/set-string-component/set-string-component.component.ts',
                  'components/set-string-edit-dialog-component/set-string-edit-dialog-component.component.css',
                  'components/set-string-edit-dialog-component/set-string-edit-dialog-component.component.html',
                  'components/set-string-edit-dialog-component/set-string-edit-dialog-component.component.spec.ts',
                  'components/set-string-edit-dialog-component/set-string-edit-dialog-component.component.ts',
                  'components/map-boolean-component/map-boolean-component.component.css',
                  'components/map-boolean-component/map-boolean-component.component.html',
                  'components/map-boolean-component/map-boolean-component.component.spec.ts',
                  'components/map-boolean-component/map-boolean-component.component.ts',
                  'components/map-number-component/map-number-component.component.css',
                  'components/map-number-component/map-number-component.component.html',
                  'components/map-number-component/map-number-component.component.spec.ts',
                  'components/map-number-component/map-number-component.component.ts',
                  'components/map-dayjs-component/map-dayjs-component.component.css',
                  'components/map-dayjs-component/map-dayjs-component.component.html',
                  'components/map-dayjs-component/map-dayjs-component.component.spec.ts',
                  'components/map-dayjs-component/map-dayjs-component.component.ts',
                  'components/map-string-component/map-string-component.component.css',
                  'components/map-string-component/map-string-component.component.html',
                  'components/map-string-component/map-string-component.component.spec.ts',
                  'components/map-string-component/map-string-component.component.ts',
                  'components/map-string-edit-dialog-component/map-string-edit-dialog-component.component.css',
                  'components/map-string-edit-dialog-component/map-string-edit-dialog-component.component.html',
                  'components/map-string-edit-dialog-component/map-string-edit-dialog-component.component.spec.ts',
                  'components/map-string-edit-dialog-component/map-string-edit-dialog-component.component.ts',
                  'components/map-number-edit-dialog-component/map-number-edit-dialog-component.component.css',
                  'components/map-number-edit-dialog-component/map-number-edit-dialog-component.component.html',
                  'components/map-number-edit-dialog-component/map-number-edit-dialog-component.component.spec.ts',
                  'components/map-number-edit-dialog-component/map-number-edit-dialog-component.component.ts',
                  'components/map-dayjs-edit-dialog-component/map-dayjs-edit-dialog-component.component.css',
                  'components/map-dayjs-edit-dialog-component/map-dayjs-edit-dialog-component.component.html',
                  'components/map-dayjs-edit-dialog-component/map-dayjs-edit-dialog-component.component.spec.ts',
                  'components/map-dayjs-edit-dialog-component/map-dayjs-edit-dialog-component.component.ts',
                  'components/map-boolean-edit-dialog-component/map-boolean-edit-dialog-component.component.css',
                  'components/map-boolean-edit-dialog-component/map-boolean-edit-dialog-component.component.html',
                  'components/map-boolean-edit-dialog-component/map-boolean-edit-dialog-component.component.spec.ts',
                  'components/map-boolean-edit-dialog-component/map-boolean-edit-dialog-component.component.ts',
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
            rootTemplatesPath: this.templatePath('../entity-templates'),
            sections: {
              files: [
                {
                  condition: generator => !generator.embedded && generator.databaseTypeCassandra && !entity.skipClient,
                  ...clientApplicationTemplatesBlock(),
                  templates: [
                    //'entities/_entityFolder_/_entityFile_.routes.ts',
                    'entities/_entityFolder_/detail/_entityFile_-detail.html',
                    'entities/_entityFolder_/detail/_entityFile_-detail.ts',
                    // detail.spec override: works for both single-key and composite entities
                    // (uses test-samples + the blueprint's <Entity>DetailComponent class name).
                    'entities/_entityFolder_/detail/_entityFile_-detail.spec.ts',
                    // delete-dialog.spec override: <Entity>DeleteDialogComponent, HttpResponse
                    // delete mock, confirmDelete(entity|id) by key shape.
                    'entities/_entityFolder_/delete/_entityFile_-delete-dialog.spec.ts',
                    // list.spec + route-resolve.spec overrides: blueprint component class names,
                    // boolean isLoading, find(...keys) mock by key shape.
                    'entities/_entityFolder_/list/_entityFile_.spec.ts',
                    'entities/_entityFolder_/route/_entityFile_-routing-resolve.service.spec.ts',
                    // service / update / form-service spec overrides — branch on key shape
                    // (single vs composite); match the blueprint API (find(...keys), HttpResponse
                    // returns, nested compositeId form, <Entity>UpdateComponent, boolean isSaving).
                    'entities/_entityFolder_/service/_entityFile_.service.spec.ts',
                    'entities/_entityFolder_/update/_entityFile_-form.service.spec.ts',
                    'entities/_entityFolder_/update/_entityFile_-update.spec.ts',
                    'entities/_entityFolder_/list/_entityFile_.html',
                    'entities/_entityFolder_/list/_entityFile_.ts',
                    //'entities/_entityFolder_/list/_entityFile_.component.spec.ts',
                    'entities/_entityFolder_/route/_entityFile_-routing-resolve.service.ts',
                    //'entities/_entityFolder_/route/_entityFile_-routing-resolve.service.spec.ts',

                    // Entity Service Files:
                    'entities/_entityFolder_/service/_entityFile_.service.ts',
                    //'entities/_entityFolder_/service/_entityFile_.service.spec.ts

                    // Entity Model Files:
                    'entities/_entityFolder_/_entityFile_.model.ts',
                    // test-samples.ts: our override matches the blueprint model for both
                    // composite (nested compositeId) and single-key (flat) entities — and,
                    // unlike base, types date-Long columns as dayjs and Set/Map correctly.
                    'entities/_entityFolder_/_entityFile_.test-samples.ts',

                    // Entity Route File:
                    'entities/_entityFolder_/_entityFile_.routes.ts',
                  ],
                },
                {
                  condition: generator =>
                    !generator.readOnly && !generator.embedded && generator.databaseTypeCassandra && !entity.skipClient,
                  ...clientApplicationTemplatesBlock(),
                  templates: [
                    'entities/_entityFolder_/update/_entityFile_-form.service.ts',
                    //'entities/_entityFolder_/update/_entityFile_-form.service.spec.ts',
                    'entities/_entityFolder_/update/_entityFile_-update.html',
                    //'entities/_entityFolder_/update/_entityFile_-update.component.spec.ts',
                    'entities/_entityFolder_/delete/_entityFile_-delete-dialog.html',
                    'entities/_entityFolder_/update/_entityFile_-update.ts',
                    'entities/_entityFolder_/delete/_entityFile_-delete-dialog.ts',
                    //'entities/_entityFolder_/delete/_entityFile_-delete-dialog.component.spec.ts',
                  ],
                },
              ],
            },
            context: {
              ...application,
              ...entity,
              ...angularSaathratriUtils,
              generateEntityClientFields,
              generateEntityClientEnumImports,
              generateEntityClientImports,
              /* Saathratri change: provide JHipster 8 compatibility variables removed in JHipster 9 */
              entityClassHumanized: entity.entityClassHumanized || entity.entityClass,
              entityFormName: entity.entityFormName || entity.entityInstance,
              entityRestName: entity.entityRestName || entity.entityApiUrl,
              frontendAppName: entity.frontendAppName || application.frontendAppName || application.baseName,
              componentName: entity.componentName || `${entity.entityAngularName}Component`,
              enumPrefix: entity.enumPrefix || '',
            },
          });
        }
      },
    });
  }

  get [BaseApplicationGenerator.POST_WRITING]() {
    return this.asPostWritingTaskGroup({
      async postWritingTemplateTask({ application }) {
        // When this generator is renamed (e.g., cassandra-angular in the orchestrator),
        // SBS template override for package.json doesn't work because the name no longer
        // matches 'angular'. Patch package.json programmatically to add Material deps.
        const packageJsonPath = 'package.json';
        this.editFile(packageJsonPath, content => {
          if (!content.includes('@angular/material')) {
            const angularVersion = application.nodeDependencies?.['@angular/common'] || '21.0.0';
            content = content.replace(
              '"@angular/platform-browser"',
              `"@angular/material": "${angularVersion}",\n    "@angular/cdk": "${angularVersion}",\n    "@angular/platform-browser"`,
            );
          }
          return content;
        });

        // Add uuid and @types/uuid to devDependencies
        this.editFile(packageJsonPath, content => {
          if (!content.includes('"uuid"')) {
            content = content.replace(
              '"vitest-sonar-reporter": null',
              '"vitest-sonar-reporter": null,\n    "@types/uuid": "10.0.0",\n    "uuid": "11.1.0",\n    "material-icons": "1.13.14"',
            );
          }
          return content;
        });

        // Force `npm test` to run one-shot. Upstream JHipster's Angular generator emits
        // `"test": "ng test --coverage"` which, after the Karma→Vitest switch, defaults to
        // WATCH mode and never exits. The neighbouring `"test:watch"` script (which adds
        // `--watch` back) proves the intent was one-shot — upstream just forgot the flag.
        // Becomes a no-op once upstream ships the fix (regex won't match the new value).
        this.editFile(packageJsonPath, content =>
          content.replace('"test": "ng test --coverage",', '"test": "ng test --coverage --watch=false",'),
        );

        // Disable Angular CLI analytics so `ng test` / `ng build` doesn't prompt the user
        // ("Would you like to share pseudonymous usage data..."), which blocks CI and
        // any non-interactive run. Injects `"analytics": false` at the top of the
        // angular.json `"cli"` block. Idempotent — won't double-inject.
        this.editFile('angular.json', content => {
          if (content.includes('"analytics"')) return content;
          return content.replace(/"cli":\s*\{\n(\s*)"cache":/, '"cli": {\n$1"analytics": false,\n$1"cache":');
        });

        // Patch webpack.microfrontend.js to share @angular/core/rxjs-interop as singleton.
        // Without this, microfrontend signal change detection breaks (e.g., isLoading spinner
        // never stops) because the host and remote get different Angular core instances.
        // SBS template override doesn't work for composed generators, so patch programmatically.
        const webpackMfPath = 'webpack/webpack.microfrontend.js';
        if (this.existsDestination(webpackMfPath)) {
          this.editFile(webpackMfPath, content => {
            if (!content.includes('@angular/core/rxjs-interop')) {
              content = content.replace(
                "'@angular/common/http': sharedDependencies['@angular/common'],",
                "'@angular/common/http': sharedDependencies['@angular/common'],\n  '@angular/core/rxjs-interop': sharedDependencies['@angular/core'],",
              );
            }
            return content;
          });
        }

        // Patch global.scss to import Angular Material theme and Material Icons.
        // SBS template override doesn't work for composed generators (cassandra-angular
        // is composed, not a direct SBS of 'angular'), so patch programmatically.
        const srcMainWebapp = application.srcMainWebapp ?? 'src/main/webapp/';
        const globalScssPath = `${srcMainWebapp}content/scss/global.scss`;
        this.editFile(globalScssPath, content => {
          if (!content.includes('@angular/material/prebuilt-themes')) {
            content = content.replace(
              "@import 'bootstrap/scss/variables';",
              "@import 'bootstrap/scss/variables';\n@import '@angular/material/prebuilt-themes/indigo-pink.css';\n@import 'material-icons/iconfont/material-icons.scss';",
            );
          }
          if (!content.includes('Infinite Scroll Styles')) {
            content = content.replace(
              '/* jhipster-needle-scss-add-main JHipster will add new css style */',
              `/* ==========================================================================
Infinite Scroll Styles
========================================================================== */
.table-entities::-webkit-scrollbar { width: 8px; }
.table-entities::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
.table-entities::-webkit-scrollbar-thumb { background: #888; border-radius: 4px; }
.table-entities::-webkit-scrollbar-thumb:hover { background: #555; }
.table-entities { scrollbar-width: thin; scrollbar-color: #888 #f1f1f1; }
/* jhipster-needle-scss-add-main JHipster will add new css style */`,
            );
          }
          // Fix .row-md.jh-entity-details grid overflow: upstream leaves dd with
          // min-width: auto, which sizes to min-content. A long unbreakable value
          // (API keys, prompt text, etc.) forces the grid past the viewport and
          // pushes the dt column off-screen, hiding every label. Patch dd so the
          // 1fr track constrains the cell and long text can wrap.
          if (!content.includes('overflow-wrap: anywhere')) {
            content = content.replace(
              `    dd {
      border-bottom: 1px solid #eee;
      padding: 0.5em 0;
      margin-left: 0;
    }`,
              `    dd {
      border-bottom: 1px solid #eee;
      padding: 0.5em 0;
      margin-left: 0;
      min-width: 0;
      overflow-wrap: anywhere;
    }`,
            );
          }
          return content;
        });

        // Patch font-awesome-icons.ts to add Cassandra-specific icons
        const fontAwesomeIconsPath = `${srcMainWebapp}app/config/font-awesome-icons.ts`;
        this.editFile(fontAwesomeIconsPath, content => {
          const extraIcons = [
            'faCheckCircle',
            'faChevronDown',
            'faChevronRight',
            'faCloud',
            'faCogs',
            'faDatabase',
            'faEye',
            'faFlag',
            'faHeart',
            'faHome',
            'faKey',
          ];
          for (const icon of extraIcons) {
            if (!content.includes(icon)) {
              content = content.replace(
                "  // jhipster-needle-add-icon-import\n} from '@fortawesome/free-solid-svg-icons';",
                `  ${icon},\n  // jhipster-needle-add-icon-import\n} from '@fortawesome/free-solid-svg-icons';`,
              );
              content = content.replace(
                / {2}\/\/ jhipster-needle-add-icon-import\n\];/,
                `  ${icon},\n  // jhipster-needle-add-icon-import\n];`,
              );
            }
          }
          return content;
        });

        // Patch shared/date/index.ts to export Cassandra-specific pipes
        // Skip for gateway — the pipe files are only written to Cassandra services
        if (!application.applicationTypeGateway) {
          const dateIndexPath = `${srcMainWebapp}app/shared/date/index.ts`;
          this.editFile(dateIndexPath, content => {
            if (!content.includes('ConvertFromDayjsToDateLongPipe')) {
              content += "\nexport { ConvertFromDayjsToDateLongPipe } from './convert-from-dayjs-to-date-long.pipe';\n";
            }
            if (!content.includes('FormatUtcDatePipe')) {
              content += "export { default as FormatUtcDatePipe } from './format-utc-date.pipe';\n";
            }
            return content;
          });
        }

        // Replace display="dynamic" (Popper.js) with display="static" (CSS) on ALL
        // navbar dropdowns. Cassandra microfrontends inject Angular Material/CDK CSS
        // that breaks Popper.js positioning for every dropdown on the page.
        if (!application.skipClient) {
          const navbarHtmlForDisplay = `${srcMainWebapp}app/layouts/navbar/navbar.html`;
          this.editFile(navbarHtmlForDisplay, content => {
            return content.replace(/display="dynamic"/g, 'display="static"');
          });
        }

        // Patch navbar.ts - add EntityNavbarItems import, property, and alphabetical sorting
        if (!application.skipClient) {
          const clientSrcDir = application.clientSrcDir || 'src/main/webapp/';
          const navbarTsFile = `${clientSrcDir}app/layouts/navbar/navbar.ts`;
          const navbarHtmlFile = `${clientSrcDir}app/layouts/navbar/navbar.html`;
          const isMicrofrontendGateway = application.microfrontend && application.applicationTypeGateway;

          this.editFile(navbarTsFile, content => {
            if (!isMicrofrontendGateway) {
              // Add EntityNavbarItems import
              if (!content.includes('EntityNavbarItems')) {
                content = content.replace(
                  "import NavbarItem from './navbar-item.model';",
                  "import { EntityNavbarItems } from 'app/entities/entity-navbar-items';\nimport NavbarItem from './navbar-item.model';",
                );
              }
              // Add entitiesNavbarItems property
              if (!content.includes('entitiesNavbarItems')) {
                content = content.replace(
                  'readonly account = inject(AccountService).account;',
                  'readonly account = inject(AccountService).account;\n  entitiesNavbarItems: NavbarItem[] = [];',
                );
              }
              // Add sorting in ngOnInit
              if (!content.includes('EntityNavbarItems].sort')) {
                content = content.replace(
                  '    this.profileService.getProfileInfo().subscribe(profileInfo => {',
                  '    // Saathratri modification - sort entity navbar items alphabetically\n' +
                    '    this.entitiesNavbarItems = [...EntityNavbarItems].sort((a, b) => a.name.localeCompare(b.name));\n' +
                    '    this.profileService.getProfileInfo().subscribe(profileInfo => {',
                );
              }
            }

            // For gateways with microfrontends: add sorting helper. Insert AFTER
            // loadMicrofrontendsEntities (immediately before the class's closing brace) so
            // the public method stays before the private helper — @typescript-eslint/member-ordering
            // requires public-before-private.
            if (isMicrofrontendGateway) {
              if (!content.includes('sortNavbarItemsAlphabetically') && content.includes('loadMicrofrontendsEntities')) {
                content = content.replace(
                  /\n\}\s*$/,
                  '\n\n' +
                    '  private sortNavbarItemsAlphabetically(items: NavbarItem[]): NavbarItem[] {\n' +
                    '    return [...items].sort((a, b) => a.name.localeCompare(b.name));\n' +
                    '  }\n' +
                    '}\n',
                );
              }
              if (content.includes('sortNavbarItemsAlphabetically')) {
                content = content.replace(/\.set\(items\)/g, '.set(this.sortNavbarItemsAlphabetically(items))');
              }
            }

            return content;
          });

          // Patch navbar.html - restructure entity menu into per-microfrontend grouped dropdowns
          if (isMicrofrontendGateway && application.microfrontends) {
            this.editFile(navbarHtmlFile, content => {
              const sortedMicrofrontends = [...application.microfrontends].sort((a, b) => a.baseName.localeCompare(b.baseName));
              const jhiPrefix = application.jhiPrefix || 'jhi';
              const { enableTranslation } = application;
              let microfrontendMenus = '';
              for (const remote of sortedMicrofrontends) {
                const translationAttr = enableTranslation
                  ? `\n                  [${jhiPrefix}Translate]="entityNavbarItem.translationKey"`
                  : '';
                microfrontendMenus += `
      @if (account() !== null && ${remote.lowercaseBaseName}EntityNavbarItems().length > 0) {
        <li ngbDropdown class="nav-item dropdown pointer" display="static" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
          <a class="nav-link dropdown-toggle" ngbDropdownToggle href="javascript:void(0);" id="${remote.lowercaseBaseName}-menu" data-cy="${remote.lowercaseBaseName}Menu">
            <span><fa-icon icon="th-list" /><span>${remote.baseName}</span></span>
          </a>
          <ul class="dropdown-menu" ngbDropdownMenu aria-labelledby="${remote.lowercaseBaseName}-menu">
            @for (entityNavbarItem of ${remote.lowercaseBaseName}EntityNavbarItems(); track $index) {
              <li>
                <a class="dropdown-item" [routerLink]="entityNavbarItem.route" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" (click)="collapseNavbar()">
                  <fa-icon icon="asterisk" [fixedWidth]="true" />${translationAttr ? `\n                  <span${translationAttr}>{{entityNavbarItem.name}}</span>` : '\n                  <span>{{entityNavbarItem.name}}</span>'}
                </a>
              </li>
            }
          </ul>
        </li>
      }`;
              }

              const entityDropdownRegex = /\s*@if \(account\(\) !== null\) \{\s*<li[\s\S]*?data-cy="entity"[\s\S]*?<\/ul>\s*<\/li>\s*\}/;
              if (entityDropdownRegex.test(content)) {
                content = content.replace(
                  entityDropdownRegex,
                  `\n      <!-- jhipster-needle-add-element-to-menu - JHipster will add new menu items here -->${
                    microfrontendMenus
                  }\n      <!-- jhipster-needle-add-entity-to-menu - JHipster will add entities to the menu here -->`,
                );
              }

              return content;
            });
          }
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
