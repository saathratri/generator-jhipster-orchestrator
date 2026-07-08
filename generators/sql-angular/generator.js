import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import BaseApplicationGenerator from 'generator-jhipster/generators/base-application';
import { filterEntitiesAndPropertiesForClient, generateEntityClientEnumImports } from 'generator-jhipster/generators/client/support';

import { describeExcludedRelationship, getExcludedRelationships } from '../sql-spring-boot/lazy-relationship-utils.js';

import { angularFilesFromSaathratri, entityModelFiles } from './entity-files.js';
import { angularSaathratriUtils } from './sql-angular-utils.js';

// Navbar modifications are applied in POST_WRITING via editFile
// to avoid needing upstream Angular variables (microfrontend, clientSrcDir, etc.)

export default class extends BaseApplicationGenerator {
  constructor(args, opts, features) {
    super(args, opts, { ...features, sbsBlueprint: true });
  }

  async beforeQueue() {
    await this.dependsOnBootstrapApplication();
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
      async preparingTemplateTask({ application }) {
        // Ensure clientSrcDir is set for clientApplicationTemplatesBlock() path resolution
        // (may not be available when composed from blueprint's client generator)
        if (!application.clientSrcDir) {
          application.clientSrcDir = 'src/main/webapp/';
        }
      },
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
      async preparingEachEntityFieldTemplateTask({ field }) {
        // Detect vector fields independently (in case sql-spring-boot hasn't set the property yet)
        if (!field.fieldTypeVectorSaathratri) {
          const vectorAnnotation = field.options?.customAnnotation?.[0];
          if (vectorAnnotation === 'VECTOR') {
            field.fieldTypeVectorSaathratri = true;
            field.vectorDimensionSaathratri = field.options?.customAnnotation?.[1] || '1536';
            const sourceFieldName = field.fieldName.replace(/Embedding$/, '');
            field.sourceFieldNameSaathratri = sourceFieldName;
            field.sourceFieldNameCapitalizedSaathratri = sourceFieldName.charAt(0).toUpperCase() + sourceFieldName.slice(1);
          }
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
          sections: {
            files: [
              {
                templates: ['template-file-sql-angular'],
              },
            ],
          },
          context: application,
        });

        // Navbar modifications are applied in POST_WRITING via editFile
      },
    });
  }

  get [BaseApplicationGenerator.WRITING_ENTITIES]() {
    return this.asWritingEntitiesTaskGroup({
      async writingEntitiesTemplateTask({ application, entities }) {
        // Use the same entity filtering as the upstream angular generator
        const entitiesWithFields = entities.map(e => ({
          ...e,
          fields: e.fields ?? [],
          relationships: e.relationships ?? [],
        }));
        const filteredEntities = (application.filterEntitiesAndPropertiesForClient ?? filterEntitiesAndPropertiesForClient)(
          entitiesWithFields,
        );

        // Diagnostic logging to understand entity structure
        this.log.info(`[sql-angular] WRITING_ENTITIES: ${entities.length} total entities, ${filteredEntities.length} after filtering`);
        this.log.info(`[sql-angular] destinationRoot: ${this.destinationRoot()}`);
        if (filteredEntities.length > 0) {
          const firstEntity = filteredEntities[0];
          this.log.info(`[sql-angular] First entity name: ${firstEntity.name}`);
          this.log.info(`[sql-angular] First entity entityFolderName: ${firstEntity.entityFolderName}`);
          this.log.info(`[sql-angular] First entity entityFileName: ${firstEntity.entityFileName}`);
          this.log.info(`[sql-angular] First entity has fields: ${!!firstEntity.fields}, count: ${firstEntity.fields?.length}`);
          this.log.info(
            `[sql-angular] First entity has relationships: ${!!firstEntity.relationships}, count: ${firstEntity.relationships?.length}`,
          );
          this.log.info(`[sql-angular] First entity keys: ${Object.keys(firstEntity).sort().join(', ')}`);
        }

        for (const entity of filteredEntities.filter(e => !e.builtIn)) {
          // Guard: skip entities that don't have required client properties
          if (!entity.entityFolderName || !entity.entityFileName) {
            this.log.warn(
              `[sql-angular] Skipping entity ${entity.name}: missing entityFolderName (${entity.entityFolderName}) or entityFileName (${entity.entityFileName})`,
            );
            continue;
          }
          if (!entity.fields) {
            this.log.warn(`[sql-angular] Skipping entity ${entity.name}: missing fields property`);
            continue;
          }

          await this.writeFiles({
            sections: entity.entityClientModelOnly ? { model: [entityModelFiles] } : angularFilesFromSaathratri,
            context: { ...application, ...entity, ...angularSaathratriUtils, generateEntityClientEnumImports },
          });
        }

        // app/entities/entity-navbar-items.ts: navbar.ts imports EntityNavbarItems from it, so the
        // file must exist or the Angular build/tests fail to compile (TS2307 cannot find module).
        // Base JHipster writes this file with an `add-entity-navbar` needle and, ONLY for
        // microservices (see angular generator addNeedles → `if (application.applicationTypeMicroservice)`),
        // needles each entity into it during postWriteEntitiesFiles. Because this blueprint replaces
        // base's entity-client writing, emit the file here — but its shape must respect that needle:
        //   • microservice  → emit JUST the needle (no entries); base populates it. Pre-populating
        //                      would duplicate every entry, and omitting the needle aborts generation
        //                      ("Missing required jhipster-needle add-entity-navbar").
        //   • monolith/other → base does NOT needle it, so populate from the filtered client entities.
        const isMicrofrontendGateway = application.microfrontend && application.applicationTypeGateway;
        if (!application.skipClient && !isMicrofrontendGateway) {
          const clientSrcDir = application.clientSrcDir || 'src/main/webapp/';
          const navbarNeedle = '  /* jhipster-needle-add-entity-navbar - JHipster will add entity navbar items here */';
          let arrayBody;
          if (application.applicationTypeMicroservice) {
            arrayBody = navbarNeedle;
          } else {
            const navbarEntities = filteredEntities.filter(e => !e.builtIn && !e.embedded && !e.entityClientModelOnly && e.entityPage);
            const items = navbarEntities
              .map(
                e =>
                  `  {\n    name: '${e.entityNameHumanized ?? e.entityClass}',\n    route: '${e.entityPage}',\n    translationKey: '${e.entityTranslationKeyMenuPath ?? `global.menu.entities.${e.entityTranslationKeyMenu}`}',\n  },`,
              )
              .join('\n');
            arrayBody = items ? `${items}\n${navbarNeedle}` : navbarNeedle;
          }
          const navbarItemsContent = `import NavbarItem from 'app/layouts/navbar/navbar-item.model';\n\nexport const EntityNavbarItems: NavbarItem[] = [\n${arrayBody}\n];\n`;
          this.writeDestination(`${clientSrcDir}app/entities/entity-navbar-items.ts`, navbarItemsContent);
        }
      },
    });
  }

  get [BaseApplicationGenerator.POST_WRITING]() {
    return this.asPostWritingTaskGroup({
      async fixWebpackMicrofrontendSharing({ application }) {
        if (application.microfrontend) {
          this.editFile('webpack/webpack.microfrontend.js', content => {
            if (content.includes('@angular/core/rxjs-interop')) return content;
            return content.replace(
              "'@angular/common/http': sharedDependencies['@angular/common'],\n  'rxjs/operators': sharedDependencies.rxjs,",
              "'@angular/common/http': sharedDependencies['@angular/common'],\n  '@angular/core/rxjs-interop': sharedDependencies['@angular/core'],\n  'rxjs/operators': sharedDependencies.rxjs,",
            );
          });
        }
      },
      async forceTestOneShot({ application }) {
        // Upstream JHipster's Angular generator emits `"test": "ng test --coverage"` which,
        // after the Karma→Vitest switch, defaults to WATCH mode and never exits. The
        // neighbouring `"test:watch"` script (which appends `--watch`) proves the intent was
        // one-shot — upstream just forgot the flag. Force `--watch=false` so CI and casual
        // local runs of `npm test` actually exit. Becomes a no-op once upstream ships the
        // fix (the regex won't match the new value).
        if (application.skipClient) return;
        this.editFile('package.json', content =>
          content.replace('"test": "ng test --coverage",', '"test": "ng test --coverage --watch=false",'),
        );
      },
      async disableAngularCliAnalytics({ application }) {
        // Disable Angular CLI analytics so `ng test` / `ng build` doesn't prompt
        // ("Would you like to share pseudonymous usage data..."), which blocks CI and
        // any non-interactive run. Injects `"analytics": false` at the top of the
        // angular.json `"cli"` block. Idempotent.
        if (application.skipClient) return;
        this.editFile('angular.json', content => {
          if (content.includes('"analytics"')) return content;
          return content.replace(/"cli":\s*\{\n(\s*)"cache":/, '"cli": {\n$1"analytics": false,\n$1"cache":');
        });
      },
      async fixEntityDetailGridOverflow({ application }) {
        // Upstream JHipster's entity-detail grid (.row-md.jh-entity-details) uses
        // `grid-template-columns: auto 1fr`, but grid items default to
        // min-width: auto (= min-content). A long unbreakable value in a dd (API
        // keys, prompt text, etc.) forces the grid to expand past the viewport
        // and pushes the dt column off-screen, hiding every label. Patch dd to
        // allow the 1fr track to actually constrain the cell and wrap long text.
        if (application.skipClient) return;
        const srcMainWebapp = application.srcMainWebapp ?? 'src/main/webapp/';
        const globalScssPath = `${srcMainWebapp}content/scss/global.scss`;
        this.editFile(globalScssPath, content => {
          if (content.includes('overflow-wrap: anywhere')) return content;
          return content.replace(
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
        });
      },
      async addMaterialDepsForGateway({ application }) {
        // SQL gateways that host Cassandra microfrontends need Angular Material
        // pre-loaded. Without this, Material CSS is injected dynamically when a
        // Cassandra microfrontend loads, shifting all navbar dropdown positions.
        if (!application.applicationTypeGateway || !application.microfrontend) return;

        // Add @angular/material, @angular/cdk, material-icons to package.json
        const packageJsonPath = 'package.json';
        this.editFile(packageJsonPath, content => {
          if (!content.includes('@angular/material')) {
            const angularVersion = application.nodeDependencies?.['@angular/common'] || '21.0.0';
            content = content.replace(
              '"@angular/platform-browser"',
              `"@angular/material": "${angularVersion}",\n    "@angular/cdk": "${angularVersion}",\n    "@angular/platform-browser"`,
            );
          }
          if (!content.includes('"material-icons"')) {
            content = content.replace('"vitest-sonar-reporter": null', '"vitest-sonar-reporter": null,\n    "material-icons": "1.13.14"');
          }
          return content;
        });

        // Add Material CSS imports to global.scss
        const srcMainWebapp = application.srcMainWebapp ?? 'src/main/webapp/';
        const globalScssPath = `${srcMainWebapp}content/scss/global.scss`;
        this.editFile(globalScssPath, content => {
          if (!content.includes('@angular/material/prebuilt-themes')) {
            content = content.replace(
              "@import 'bootstrap/scss/variables';",
              "@import 'bootstrap/scss/variables';\n@import '@angular/material/prebuilt-themes/indigo-pink.css';\n@import 'material-icons/iconfont/material-icons.scss';",
            );
          }
          return content;
        });
      },
      async fixNavbarDropdownDisplay({ application }) {
        // Replace display="dynamic" (Popper.js) with display="static" (CSS) on ALL
        // navbar dropdowns. Cassandra microfrontends inject Angular Material/CDK CSS
        // that breaks Popper.js positioning for every dropdown on the page.
        if (application.skipClient) return;
        const clientSrcDir = application.clientSrcDir || 'src/main/webapp/';
        const navbarHtmlFile = `${clientSrcDir}app/layouts/navbar/navbar.html`;
        this.editFile(navbarHtmlFile, content => {
          return content.replace(/display="dynamic"/g, 'display="static"');
        });
      },
      async postWritingTemplateTask({ application }) {
        // Only patch navbar for applications that have a client
        if (application.skipClient) return;

        const clientSrcDir = application.clientSrcDir || 'src/main/webapp/';
        const navbarTsFile = `${clientSrcDir}app/layouts/navbar/navbar.ts`;
        const navbarHtmlFile = `${clientSrcDir}app/layouts/navbar/navbar.html`;

        // === Patch navbar.ts ===
        const isMicrofrontendGateway = application.microfrontend && application.applicationTypeGateway;
        this.editFile(navbarTsFile, content => {
          if (!isMicrofrontendGateway) {
            // For non-gateway apps: add EntityNavbarItems import, property, and sorting
            // 1. Add EntityNavbarItems import
            if (!content.includes('EntityNavbarItems')) {
              content = content.replace(
                "import NavbarItem from './navbar-item.model';",
                "import { EntityNavbarItems } from 'app/entities/entity-navbar-items';\nimport NavbarItem from './navbar-item.model';",
              );
            }

            // 2. Add entitiesNavbarItems property
            if (!content.includes('entitiesNavbarItems')) {
              content = content.replace(
                'readonly account = inject(AccountService).account;',
                'readonly account = inject(AccountService).account;\n  entitiesNavbarItems: NavbarItem[] = [];',
              );
            }

            // 3. Add sorting in ngOnInit (insert before profileService.getProfileInfo)
            if (!content.includes('EntityNavbarItems].sort')) {
              content = content.replace(
                '    this.profileService.getProfileInfo().subscribe(profileInfo => {',
                '    // Saathratri modification - sort entity navbar items alphabetically\n' +
                  '    this.entitiesNavbarItems = [...EntityNavbarItems].sort((a, b) => a.name.localeCompare(b.name));\n' +
                  '    this.profileService.getProfileInfo().subscribe(profileInfo => {',
              );
            }
          }

          // For gateways with microfrontends: add sorting helper and wrap .set() calls
          if (isMicrofrontendGateway) {
            // 4. Add sortNavbarItemsAlphabetically helper method AFTER loadMicrofrontendsEntities
            // (immediately before the class's closing brace) so the public method stays before the
            // private helper — @typescript-eslint/member-ordering requires public-before-private.
            if (!content.includes('sortNavbarItemsAlphabetically') && content.includes('loadMicrofrontendsEntities')) {
              content = content.replace(
                /\n\}\s*$/,
                '\n\n' +
                  '  // Saathratri modification - alphabetical sorting helper\n' +
                  '  private sortNavbarItemsAlphabetically(items: NavbarItem[]): NavbarItem[] {\n' +
                  '    return [...items].sort((a, b) => a.name.localeCompare(b.name));\n' +
                  '  }\n' +
                  '}\n',
              );
            }

            // 5. Wrap microfrontend item .set(items) with sorting helper
            if (content.includes('sortNavbarItemsAlphabetically')) {
              content = content.replace(/\.set\(items\)/g, '.set(this.sortNavbarItemsAlphabetically(items))');
            }
          }

          return content;
        });

        // === Patch core/microfrontend/index.ts - cache-bust remoteEntry.js fetches ===
        // remoteEntry.js has a stable URL but new content on every deploy, and the prod
        // CachingHttpHeadersFilter serves it with a multi-year max-age — so CDN edges and
        // browsers keep executing a stale copy whose hashed chunk names no longer exist
        // (ChunkLoadError → the microfrontend silently vanishes from the navbar).
        // A per-page-load query param forces a fresh fetch on every load.
        if (isMicrofrontendGateway) {
          const microfrontendIndexFile = `${clientSrcDir}app/core/microfrontend/index.ts`;
          this.editFile(microfrontendIndexFile, content => {
            if (!content.includes('remoteEntryCacheBust')) {
              content = content.replace(
                "import NavbarItem from 'app/layouts/navbar/navbar-item.model';",
                "import NavbarItem from 'app/layouts/navbar/navbar-item.model';\n\n" +
                  '// Saathratri modification - remoteEntry.js is mutable content at a stable URL;\n' +
                  '// bust CDN/browser caches once per page load so deploys are picked up immediately.\n' +
                  'const remoteEntryCacheBust = Date.now();',
              );
              content = content.replace(
                /remoteEntry: `\.\/services\/\$\{service\}\/remoteEntry\.js`/g,
                'remoteEntry: `./services/${service}/remoteEntry.js?ts=${remoteEntryCacheBust}`',
              );
            }
            return content;
          });
        }

        // === Patch navbar.html - restructure entity menu into per-microfrontend grouped dropdowns ===
        if (application.microfrontend && application.applicationTypeGateway && application.microfrontends) {
          this.editFile(navbarHtmlFile, content => {
            // Sort microfrontends alphabetically
            const sortedMicrofrontends = [...application.microfrontends].sort((a, b) => a.baseName.localeCompare(b.baseName));

            // Build per-microfrontend dropdown HTML
            const jhiPrefix = application.jhiPrefix || 'jhi';
            const { enableTranslation } = application;
            let microfrontendMenus = '';
            for (const remote of sortedMicrofrontends) {
              const translationAttr = enableTranslation
                ? `\n                  [${jhiPrefix}Translate]="entityNavbarItem.translationKey"`
                : '';
              microfrontendMenus += `
      <!-- ${remote.baseName} Service Menu -->
      @if (account() !== null && ${remote.lowercaseBaseName}EntityNavbarItems().length > 0) {
        <li
          ngbDropdown
          class="nav-item dropdown pointer"
          display="static"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
        >
          <a class="nav-link dropdown-toggle" ngbDropdownToggle href="javascript:void(0);" id="${remote.lowercaseBaseName}-menu" data-cy="${remote.lowercaseBaseName}Menu">
            <span>
              <fa-icon icon="th-list" />
              <span>${remote.baseName}</span>
            </span>
          </a>
          <ul class="dropdown-menu" ngbDropdownMenu aria-labelledby="${remote.lowercaseBaseName}-menu">
            @for (entityNavbarItem of ${remote.lowercaseBaseName}EntityNavbarItems(); track $index) {
              <li>
                <a
                  class="dropdown-item"
                  [routerLink]="entityNavbarItem.route"
                  routerLinkActive="active"
                  [routerLinkActiveOptions]="{ exact: true }"
                  (click)="collapseNavbar()"
                >
                  <fa-icon icon="asterisk" [fixedWidth]="true" />${translationAttr ? `\n                  <span${translationAttr}\n                  >{{entityNavbarItem.name}}</span>` : '\n                  <span>{{entityNavbarItem.name}}</span>'}
                </a>
              </li>
            }
          </ul>
        </li>
      }`;
            }

            // Find and replace the upstream single entity dropdown with per-microfrontend dropdowns
            // The upstream entity dropdown: @if (account() !== null) { <li...data-cy="entity">...<ul>...</ul></li> }
            // Use greedy match up to </ul> then match the outer </li> and closing }
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
      },

      async writeLazyRelationshipReadModalComponent({ application }) {
        // Writes the shared LazyRelationshipReadModal component into the app's
        // webapp/app/shared/lazy-relationship/ directory. The component is
        // generic — caller passes parentApiUrl/parentId/fieldName/etc. via
        // componentInstance after open. Used by detail pages to lazy-load
        // entityGraphExcludeCustomAnnotation fields on demand.
        //
        // Idempotent — writeDestination overwrites whatever's there, but the
        // file content is fully derived from inputs so re-runs are no-ops.
        if (application.skipClient || !application.databaseTypeSql || !application.applicationTypeMicroservice) {
          return;
        }
        const clientSrcDir = application.clientSrcDir || 'src/main/webapp/';
        const dir = `${clientSrcDir}app/shared/lazy-relationship`;

        const componentTs = `import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { NgbActiveModal, NgbPagination } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Generic read-only popup that lazy-loads a single excluded relationship of
 * a parent entity (one of the fields listed in entityGraphExcludeCustomAnnotation).
 *
 * Caller workflow (typical):
 *   const modal = this.modalService.open(LazyRelationshipReadModalComponent, { size: 'lg', backdrop: 'static' });
 *   modal.componentInstance.parentApiUrl = '/api/taj-organizations';
 *   modal.componentInstance.parentId = this.entity.id;
 *   modal.componentInstance.fieldName = 'customers';
 *   modal.componentInstance.fieldDisplayName = 'Customers';
 *   modal.componentInstance.displayLabelField = 'name';   // or null to fall back to id
 */
@Component({
  selector: 'jhi-lazy-relationship-read-modal',
  standalone: true,
  templateUrl: './lazy-relationship-read-modal.html',
  imports: [CommonModule, FormsModule, NgbPagination, TranslateModule],
})
export class LazyRelationshipReadModalComponent implements OnInit {
  // Inputs set by caller via componentInstance after modalService.open(...).
  parentApiUrl = '';
  parentId: string | number = '';
  fieldName = '';
  fieldDisplayName = '';
  // displayLabelField: a single field on the peer (legacy DISPLAY_IN_GUI_RELATIONSHIP_LINK marker).
  // displayLabelPath: a space-separated set of dot-paths through a relationship on the peer
  //   (e.g. "person.firstName person.lastName"); takes priority over displayLabelField.
  // If neither is set, renderer falls back to the peer's id.
  displayLabelField: string | null = null;
  displayLabelPath: string | null = null;

  protected readonly activeModal = inject(NgbActiveModal);
  private readonly http = inject(HttpClient);

  readonly items = signal<Array<Record<string, unknown>>>([]);
  readonly totalItems = signal<number>(0);
  readonly page = signal<number>(1);
  readonly pageSize = signal<number>(20);
  readonly searchTerm = signal<string>('');
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    let params = new HttpParams()
      .set('page', String(this.page() - 1)) // ngb-pagination is 1-based, Spring Pageable is 0-based
      .set('size', String(this.pageSize()));
    const term = this.searchTerm().trim();
    if (term) {
      params = params.set('search', term);
    }
    const url = \`\${this.parentApiUrl}/\${encodeURIComponent(String(this.parentId))}/\${this.fieldName}\`;
    this.http.get<Array<Record<string, unknown>>>(url, { params, observe: 'response' }).subscribe({
      next: response => {
        this.items.set(response.body ?? []);
        const totalHeader = response.headers.get('X-Total-Count');
        this.totalItems.set(totalHeader ? parseInt(totalHeader, 10) || 0 : (response.body?.length ?? 0));
        this.loading.set(false);
      },
      error: err => {
        this.errorMessage.set(err?.message ?? 'Failed to load');
        this.loading.set(false);
      },
    });
  }

  onPageChange(newPage: number): void {
    if (newPage === this.page()) return;
    this.page.set(newPage);
    this.load();
  }

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
    this.page.set(1);
    this.load();
  }

  getDisplayLabel(item: Record<string, unknown>): string {
    // Path takes priority — composes the label from one or more relationship paths
    // (e.g. "person.firstName person.lastName") and joins the results with spaces.
    if (this.displayLabelPath) {
      const paths = this.displayLabelPath.trim().split(/\\s+/).filter(Boolean);
      const values = paths
        .map(p => this.walkPath(item, p))
        .filter(v => v != null && v !== '')
        .map(v => String(v));
      if (values.length) return values.join(' ');
    }
    if (this.displayLabelField && item[this.displayLabelField] != null) {
      return String(item[this.displayLabelField]);
    }
    const id = item['id'];
    return id != null ? String(id) : '';
  }

  private walkPath(obj: Record<string, unknown>, path: string): unknown {
    let cur: unknown = obj;
    for (const part of path.split('.')) {
      if (cur == null || typeof cur !== 'object') return null;
      cur = (cur as Record<string, unknown>)[part];
    }
    return cur;
  }

  cancel(): void {
    this.activeModal.dismiss();
  }
}
`;

        const componentHtml = `<div class="modal-header">
  <h4 class="modal-title">{{ fieldDisplayName }}</h4>
  <button type="button" class="btn-close" aria-label="Close" (click)="cancel()"></button>
</div>
<div class="modal-body">
  <div class="row mb-3">
    <div class="col-md-12">
      <input
        type="text"
        class="form-control"
        placeholder="Search..."
        [ngModel]="searchTerm()"
        (ngModelChange)="onSearchInput($event)"
      />
    </div>
  </div>
  @if (loading()) {
    <div class="text-center py-3"><em>Loading...</em></div>
  } @else if (errorMessage()) {
    <div class="alert alert-danger">{{ errorMessage() }}</div>
  } @else if (items().length === 0) {
    <div class="alert alert-warning">No items found.</div>
  } @else {
    <table class="table table-striped table-hover">
      <thead>
        <tr>
          <th>{{ displayLabelField || 'ID' }}</th>
        </tr>
      </thead>
      <tbody>
        @for (item of items(); track $index) {
          <tr>
            <td>{{ getDisplayLabel(item) }}</td>
          </tr>
        }
      </tbody>
    </table>
    <div class="d-flex justify-content-between align-items-center">
      <span class="text-muted">Showing {{ items().length }} of {{ totalItems() }}</span>
      @if (totalItems() > pageSize()) {
        <ngb-pagination
          [collectionSize]="totalItems()"
          [page]="page()"
          (pageChange)="onPageChange($event)"
          [pageSize]="pageSize()"
          [maxSize]="5"
          [rotate]="true"
          [boundaryLinks]="true"
        ></ngb-pagination>
      }
    </div>
  }
</div>
<div class="modal-footer">
  <button type="button" class="btn btn-secondary" (click)="cancel()">Close</button>
</div>
`;

        this.writeDestination(this.destinationPath(`${dir}/lazy-relationship-read-modal.ts`), componentTs);
        this.writeDestination(this.destinationPath(`${dir}/lazy-relationship-read-modal.html`), componentHtml);
        this.log.ok(`[sql-angular] lazy-load: wrote LazyRelationshipReadModalComponent into ${dir}`);
      },

      async writeLazyRelationshipEditModalComponent({ application }) {
        // Editable counterpart of LazyRelationshipReadModalComponent. Fetches:
        //   - GET /{parentApiUrl}/{parentId}/{fieldName}/ids        (current member IDs, for pre-selection)
        //   - GET /{parentApiUrl}/{parentId}/{fieldName}/candidates (paginated peer list for picker)
        // Renders checkboxes per row (pre-checked from /ids), preserves the
        // selection set across pagination/search, and on Save PUTs the new
        // membership set to /{parentApiUrl}/{parentId}/{fieldName}.
        if (application.skipClient || !application.databaseTypeSql || !application.applicationTypeMicroservice) {
          return;
        }
        const clientSrcDir = application.clientSrcDir || 'src/main/webapp/';
        const dir = `${clientSrcDir}app/shared/lazy-relationship`;

        const componentTs = `import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { NgbActiveModal, NgbPagination } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Generic edit popup for a single excluded relationship of a parent entity.
 *
 * The user picks which existing peer entities should be members of the
 * relationship (no new-peer creation here — peers are created via their
 * own admin pages). The selection set is preserved across pagination and
 * search so a Save commits the full picked set, not just the current page.
 *
 * Caller workflow:
 *   const modal = this.modalService.open(LazyRelationshipEditModalComponent, { size: 'lg', backdrop: 'static' });
 *   modal.componentInstance.parentApiUrl = '/api/taj-organizations';
 *   modal.componentInstance.parentId = this.entity.id;
 *   modal.componentInstance.fieldName = 'customers';
 *   modal.componentInstance.fieldDisplayName = 'Customers';
 *   modal.componentInstance.displayLabelField = 'name';
 *   modal.result.then(saved => { ... });  // 'saved' if Save clicked, dismissed otherwise
 */
@Component({
  selector: 'jhi-lazy-relationship-edit-modal',
  standalone: true,
  templateUrl: './lazy-relationship-edit-modal.html',
  imports: [CommonModule, FormsModule, NgbPagination, TranslateModule],
})
export class LazyRelationshipEditModalComponent implements OnInit {
  parentApiUrl = '';
  parentId: string | number = '';
  fieldName = '';
  fieldDisplayName = '';
  // displayLabelField: a single field on the peer (legacy DISPLAY_IN_GUI_RELATIONSHIP_LINK marker).
  // displayLabelPath: a space-separated set of dot-paths through a relationship on the peer
  //   (e.g. "person.firstName person.lastName"); takes priority over displayLabelField.
  // If neither is set, renderer falls back to the peer's id.
  displayLabelField: string | null = null;
  displayLabelPath: string | null = null;

  protected readonly activeModal = inject(NgbActiveModal);
  private readonly http = inject(HttpClient);

  readonly candidates = signal<Array<Record<string, unknown>>>([]);
  readonly totalCandidates = signal<number>(0);
  readonly page = signal<number>(1);
  readonly pageSize = signal<number>(20);
  readonly searchTerm = signal<string>('');
  readonly loadingCandidates = signal<boolean>(false);
  readonly loadingIds = signal<boolean>(false);
  readonly saving = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Stringified ids so a UUID and a numeric primary key compare consistently.
  readonly selectedIds = signal<Set<string>>(new Set());

  ngOnInit(): void {
    this.loadIds();
    this.loadCandidates();
  }

  loadIds(): void {
    this.loadingIds.set(true);
    const url = \`\${this.parentApiUrl}/\${encodeURIComponent(String(this.parentId))}/\${this.fieldName}/ids\`;
    this.http.get<Array<string | number>>(url).subscribe({
      next: ids => {
        this.selectedIds.set(new Set((ids ?? []).map(id => String(id))));
        this.loadingIds.set(false);
      },
      error: err => {
        this.errorMessage.set(err?.message ?? 'Failed to load current selection');
        this.loadingIds.set(false);
      },
    });
  }

  loadCandidates(): void {
    this.loadingCandidates.set(true);
    let params = new HttpParams()
      .set('page', String(this.page() - 1))
      .set('size', String(this.pageSize()));
    const term = this.searchTerm().trim();
    if (term) params = params.set('search', term);
    const url = \`\${this.parentApiUrl}/\${encodeURIComponent(String(this.parentId))}/\${this.fieldName}/candidates\`;
    this.http.get<Array<Record<string, unknown>>>(url, { params, observe: 'response' }).subscribe({
      next: response => {
        this.candidates.set(response.body ?? []);
        const totalHeader = response.headers.get('X-Total-Count');
        this.totalCandidates.set(totalHeader ? parseInt(totalHeader, 10) || 0 : (response.body?.length ?? 0));
        this.loadingCandidates.set(false);
      },
      error: err => {
        this.errorMessage.set(err?.message ?? 'Failed to load candidates');
        this.loadingCandidates.set(false);
      },
    });
  }

  onPageChange(newPage: number): void {
    if (newPage === this.page()) return;
    this.page.set(newPage);
    this.loadCandidates();
  }

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
    this.page.set(1);
    this.loadCandidates();
  }

  isSelected(item: Record<string, unknown>): boolean {
    const id = item['id'];
    return id != null && this.selectedIds().has(String(id));
  }

  toggle(item: Record<string, unknown>): void {
    const id = item['id'];
    if (id == null) return;
    const next = new Set(this.selectedIds());
    const key = String(id);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.selectedIds.set(next);
  }

  getDisplayLabel(item: Record<string, unknown>): string {
    // Path takes priority — composes the label from one or more relationship paths
    // (e.g. "person.firstName person.lastName") and joins the results with spaces.
    if (this.displayLabelPath) {
      const paths = this.displayLabelPath.trim().split(/\\s+/).filter(Boolean);
      const values = paths
        .map(p => this.walkPath(item, p))
        .filter(v => v != null && v !== '')
        .map(v => String(v));
      if (values.length) return values.join(' ');
    }
    if (this.displayLabelField && item[this.displayLabelField] != null) {
      return String(item[this.displayLabelField]);
    }
    const id = item['id'];
    return id != null ? String(id) : '';
  }

  private walkPath(obj: Record<string, unknown>, path: string): unknown {
    let cur: unknown = obj;
    for (const part of path.split('.')) {
      if (cur == null || typeof cur !== 'object') return null;
      cur = (cur as Record<string, unknown>)[part];
    }
    return cur;
  }

  save(): void {
    this.saving.set(true);
    this.errorMessage.set(null);
    const url = \`\${this.parentApiUrl}/\${encodeURIComponent(String(this.parentId))}/\${this.fieldName}\`;
    const ids = Array.from(this.selectedIds());
    this.http.put<void>(url, ids).subscribe({
      next: () => {
        this.saving.set(false);
        this.activeModal.close('saved');
      },
      error: err => {
        this.errorMessage.set(err?.message ?? 'Save failed');
        this.saving.set(false);
      },
    });
  }

  cancel(): void {
    this.activeModal.dismiss();
  }
}
`;

        const componentHtml = `<div class="modal-header">
  <h4 class="modal-title">Edit {{ fieldDisplayName }}</h4>
  <button type="button" class="btn-close" aria-label="Close" (click)="cancel()" [disabled]="saving()"></button>
</div>
<div class="modal-body">
  <div class="row mb-3">
    <div class="col-md-12">
      <input
        type="text"
        class="form-control"
        placeholder="Search..."
        [ngModel]="searchTerm()"
        (ngModelChange)="onSearchInput($event)"
      />
    </div>
  </div>
  @if (errorMessage()) {
    <div class="alert alert-danger">{{ errorMessage() }}</div>
  }
  @if (loadingCandidates() || loadingIds()) {
    <div class="text-center py-3"><em>Loading...</em></div>
  } @else if (candidates().length === 0) {
    <div class="alert alert-warning">No candidates found.</div>
  } @else {
    <table class="table table-striped table-hover">
      <thead>
        <tr>
          <th style="width: 3rem;"></th>
          <th>{{ displayLabelField || 'ID' }}</th>
        </tr>
      </thead>
      <tbody>
        @for (item of candidates(); track $index) {
          <tr (click)="toggle(item)" style="cursor: pointer;">
            <td><input type="checkbox" class="form-check-input" [checked]="isSelected(item)" (click)="$event.stopPropagation(); toggle(item)" /></td>
            <td>{{ getDisplayLabel(item) }}</td>
          </tr>
        }
      </tbody>
    </table>
    <div class="d-flex justify-content-between align-items-center">
      <span class="text-muted">{{ selectedIds().size }} selected of {{ totalCandidates() }} total</span>
      @if (totalCandidates() > pageSize()) {
        <ngb-pagination
          [collectionSize]="totalCandidates()"
          [page]="page()"
          (pageChange)="onPageChange($event)"
          [pageSize]="pageSize()"
          [maxSize]="5"
          [rotate]="true"
          [boundaryLinks]="true"
        ></ngb-pagination>
      }
    </div>
  }
</div>
<div class="modal-footer">
  <button type="button" class="btn btn-secondary" (click)="cancel()" [disabled]="saving()">Cancel</button>
  <button type="button" class="btn btn-primary" (click)="save()" [disabled]="saving() || loadingCandidates() || loadingIds()">
    @if (saving()) { <em>Saving...</em> } @else { Save }
  </button>
</div>
`;

        this.writeDestination(this.destinationPath(`${dir}/lazy-relationship-edit-modal.ts`), componentTs);
        this.writeDestination(this.destinationPath(`${dir}/lazy-relationship-edit-modal.html`), componentHtml);
        this.log.ok(`[sql-angular] lazy-load: wrote LazyRelationshipEditModalComponent into ${dir}`);
      },
    });
  }

  get [BaseApplicationGenerator.POST_WRITING_ENTITIES]() {
    return this.asPostWritingEntitiesTaskGroup({
      async postWritingEntitiesTemplateTask({ application, entities }) {
        const clientSrcDir = application.clientSrcDir || 'src/main/webapp/';

        for (const entity of entities.filter(e => !e.builtIn)) {
          // Guard: skip entities that don't have required client properties
          if (!entity.entityFolderName || !entity.entityFileName) continue;

          // Fix toSignal() for microfrontend compatibility. Module Federation loads
          // remote components outside Angular's injection context. Use Injector +
          // runInInjectionContext to ensure toSignal() has access to the DI context.
          const listTsForToSignalFix = `${clientSrcDir}app/entities/${entity.entityFolderName}/list/${entity.entityFileName}.ts`;
          this.editFile(listTsForToSignalFix, content => {
            if (!content.includes('filterOptions = toSignal(') && !content.includes('filterOptions;')) return content;
            if (content.includes('runInInjectionContext')) return content; // already patched

            // Add Injector and runInInjectionContext imports
            if (!content.includes('Injector')) {
              content = content.replace(/import \{ (.*?) \} from '@angular\/core';/, (match, imports) => {
                let updated = imports;
                if (!updated.includes('Injector')) updated += ', Injector';
                if (!updated.includes('inject')) updated += ', inject';
                return `import { ${updated} } from '@angular/core';`;
              });
            }
            if (!content.includes('runInInjectionContext')) {
              content = content.replace(
                /import \{ (.*?) \} from '@angular\/core';/,
                (match, imports) => `import { ${imports}, runInInjectionContext } from '@angular/core';`,
              );
            }

            // Change field initializer to uninitialized declaration (if not already)
            content = content.replace(
              /protected readonly filterOptions = toSignal\(this\.filters\.filterChanges\);/,
              'protected readonly filterOptions;',
            );

            // Add injector field if not present
            if (!content.includes('private readonly injector')) {
              content = content.replace(
                /protected modalService = inject\(NgbModal\);/,
                'protected modalService = inject(NgbModal);\n  private readonly injector = inject(Injector);',
              );
            }

            // Replace toSignal in constructor with runInInjectionContext version
            content = content.replace(
              /constructor\(\) \{\n\s*this\.filterOptions = toSignal\(this\.filters\.filterChanges\);/,
              'constructor() {\n    this.filterOptions = runInInjectionContext(this.injector, () => toSignal(this.filters.filterChanges));',
            );
            // Also handle if constructor doesn't have toSignal yet (field was already changed to uninitialized)
            if (!content.includes('runInInjectionContext(this.injector')) {
              content = content.replace(
                /constructor\(\) \{/,
                'constructor() {\n    this.filterOptions = runInInjectionContext(this.injector, () => toSignal(this.filters.filterChanges));',
              );
            }

            return content;
          });

          // --- Patch the Angular entity service's default find(id) to hit the
          // --- "full details" entity-graph endpoint whenever the entity declares
          // --- an @entityGraphExcludeCustomAnnotation. The include-annotation
          // --- graph (narrow) is still used by the backend's default findOne
          // --- and by explicit callers that need a lighter payload; the JHipster
          // --- admin detail/edit views want every relationship column rendered,
          // --- which only the exclude-annotation ("full") graph guarantees.
          const excludeAnnotation = entity.annotations?.entityGraphExcludeCustomAnnotation;
          if (typeof excludeAnnotation === 'string' && excludeAnnotation.trim()) {
            const firstDirective = excludeAnnotation.split('|')[0].trim();
            const colonIdx = firstDirective.indexOf(':');
            const fullDetailsMethod = colonIdx > 0 ? firstDirective.substring(0, colonIdx).trim() : '';
            if (fullDetailsMethod) {
              const fullDetailsServiceTsFile = `${clientSrcDir}app/entities/${entity.entityFolderName}/service/${entity.entityFileName}.service.ts`;
              this.editFile(fullDetailsServiceTsFile, content => {
                if (content.includes(`/${fullDetailsMethod}\``)) return content;
                // Only rewrite the default find(id) URL - leave findAll, create,
                // update, etc. untouched. Match the exact template-literal shape
                // produced by upstream JHipster's _entityFile_.service.ts.ejs.
                const findUrlPattern =
                  /find\(id: string\)[\s\S]*?\.get<Rest\w+>\(`\$\{this\.resourceUrl\}\/\$\{encodeURIComponent\(id\)\}(`)/;
                return content.replace(findUrlPattern, match => match.replace(/`$/, `/${fullDetailsMethod}\``));
              });
              this.log.info(`[sql-angular] Patched ${fullDetailsServiceTsFile} find(id) -> /${fullDetailsMethod}`);
            }
          }

          // --- Mirror the HTML template's excluded-relationship filter into the
          // --- update.ts and -form.service.ts so those relationships don't leave
          // --- behind dead <X>Service.query() calls, unused signals/injects, or
          // --- FormControls that would send an empty array on every save. The
          // --- HTML template (update.html.ejs) already skips these - this just
          // --- cleans up the matching supporting code in the two upstream-
          // --- generated TypeScript files we don't own a template for.
          const excludedFormRels = [];
          if (typeof excludeAnnotation === 'string' && excludeAnnotation.trim()) {
            const firstDirective = excludeAnnotation.split('|')[0].trim();
            const bracketMatch = firstDirective.match(/\[\s*([^\]]+?)\s*\]/);
            if (bracketMatch) {
              const excludedNames = bracketMatch[1]
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);
              for (const name of excludedNames) {
                const rel = (entity.relationships || []).find(
                  r =>
                    r.propertyName === name ||
                    r.relationshipFieldNamePlural === name ||
                    r.relationshipFieldName === name ||
                    r.relationshipName === name,
                );
                if (rel) excludedFormRels.push(rel);
              }
            }
          }

          if (excludedFormRels.length) {
            const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const updateTsFile = `${clientSrcDir}app/entities/${entity.entityFolderName}/update/${entity.entityFileName}-update.ts`;
            const formSvcFile = `${clientSrcDir}app/entities/${entity.entityFolderName}/update/${entity.entityFileName}-form.service.ts`;

            this.editFile(updateTsFile, content => {
              for (const rel of excludedFormRels) {
                const ea = rel.otherEntity.entityAngularName;
                // Shared-collection variable names come from the OTHER entity's instance plural
                // (upstream template: `<%= otherEntity.entityInstancePlural %>SharedCollection`),
                // NOT from the relationship's propertyName. For relationships like
                // `hiredContractor -> Contractor` these differ (hiredContractors vs contractors),
                // so matching by pn silently fails and leaves orphans. They coincide only when
                // the JDL names the relationship after the other entity's plural (e.g. customers
                // -> Customer), which is why the bug was latent until a mismatched rel was added.
                const eip = rel.otherEntity.entityInstancePlural;
                const svcVar = `${ea.charAt(0).toLowerCase() + ea.slice(1)}Service`;
                const eaE = escapeRe(ea);
                const eipE = escapeRe(eip);
                const svcE = escapeRe(svcVar);

                // Drop "import { IX } from '...';" and "import { XService } from '...';"
                content = content.replace(new RegExp(`^import \\{ I${eaE} \\} from [^\\n]*?;\\n`, 'm'), '');
                content = content.replace(new RegExp(`^import \\{ ${eaE}Service \\} from [^\\n]*?;\\n`, 'm'), '');
                // Drop "xsSharedCollection = signal<IX[]>([]);" (name derives from otherEntity.entityInstancePlural)
                content = content.replace(new RegExp(`\\s*${eipE}SharedCollection = signal<I${eaE}\\[\\]>\\(\\[\\]\\);`), '');
                // Drop "protected xService = inject(XService);"
                content = content.replace(new RegExp(`\\s*protected ${svcE} = inject\\(${eaE}Service\\);`), '');
                // Drop "compareX = (o1: IX | null, o2: IX | null): boolean => this.xService.compareX(o1, o2);"
                content = content.replace(
                  new RegExp(
                    `\\s*compare${eaE} = \\(o1: I${eaE} \\| null, o2: I${eaE} \\| null\\): boolean =>[\\s\\n]*this\\.${svcE}\\.compare${eaE}\\(o1, o2\\);`,
                  ),
                  '',
                );
                // Drop updateForm block "this.xsSharedCollection.update(xs => ...);" — the block
                // body accesses `tajOrganization.${pn}`, but the collection itself is named after
                // eip, so we anchor the regex on the collection prefix.
                content = content.replace(new RegExp(`\\s*this\\.${eipE}SharedCollection\\.update\\([\\s\\S]*?\\n\\s*\\);`), '');
                // Drop loadRelationshipsOptions block "this.xService.query()...subscribe(...);"
                content = content.replace(new RegExp(`\\s*this\\.${svcE}\\s*\\.query\\(\\)[\\s\\S]*?\\.subscribe\\([\\s\\S]*?\\);`), '');
              }
              return content;
            });

            this.editFile(formSvcFile, content => {
              // Defensive: if the file wasn't written yet or isn't a string, bail
              // out and leave it alone. Returning anything falsy here has caused
              // the file to vanish from the output on past runs.
              if (typeof content !== 'string' || content.length === 0) {
                this.log.info(`[sql-angular] skip form-service edit, empty content: ${formSvcFile}`);
                return content;
              }
              const excludedPns = excludedFormRels.map(r => r.propertyName);
              // Upstream writes the Pick<> union on a SINGLE long line
              // (prettier re-wraps it later). Line filtering can't touch it,
              // so strip excluded names out of the in-line union first.
              for (const pn of excludedPns) {
                const pnEsc = pn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                content = content.replace(new RegExp(`\\s*\\|\\s*'${pnEsc}'`, 'g'), '');
              }
              const lines = content.split('\n');
              const kept = [];
              let dropped = 0;
              // The upstream createFormGroup formats each entry over 3 lines:
              //     xs: new FormControl(
              //       tajOrganizationRawValue.xs ?? []
              //     ),
              // so when we drop the first line we also have to consume everything
              // up to and including the `),` that closes that call. We track
              // "remainingParens" while skipping to allow for any bracket depth.
              let skipUntilParensClose = 0;
              for (const line of lines) {
                if (skipUntilParensClose > 0) {
                  // continue dropping until the paren count balances
                  for (const ch of line) {
                    if (ch === '(') skipUntilParensClose++;
                    else if (ch === ')') skipUntilParensClose--;
                  }
                  dropped++;
                  continue;
                }
                const trimmed = line.trim();
                let drop = false;
                for (const pn of excludedPns) {
                  if (
                    // Pick union entry:            | 'xs'
                    trimmed === `| '${pn}'` ||
                    // FormGroupContent decl:       xs: FormControl<...['xs']>;
                    (/^\w+: FormControl<.+>;$/.test(trimmed) && trimmed.startsWith(`${pn}: `)) ||
                    // createFormGroup init:        xs: new FormControl(...) - may be 1 or many lines
                    trimmed.startsWith(`${pn}: new FormControl(`) ||
                    // getFormDefaults entry:       xs: [],
                    trimmed === `${pn}: [],` ||
                    // convertToRawValue entry:     xs: tajOrganization.xs ?? [],
                    (trimmed.startsWith(`${pn}: `) && trimmed.endsWith(`.${pn} ?? [],`))
                  ) {
                    drop = true;
                    dropped++;
                    // If this is the FormControl opener, start paren-balancing
                    // so the next N lines (body + `),`) get swept too.
                    if (trimmed.startsWith(`${pn}: new FormControl(`)) {
                      let depth = 0;
                      for (const ch of line) {
                        if (ch === '(') depth++;
                        else if (ch === ')') depth--;
                      }
                      if (depth > 0) skipUntilParensClose = depth;
                    }
                    break;
                  }
                }
                if (!drop) kept.push(line);
              }
              this.log.info(
                `[sql-angular] form-service: dropped ${dropped} line(s) for ${excludedPns.join(',')} in ${entity.entityFileName}`,
              );
              const result = kept.join('\n');
              // Debug: dump the pre/post content so we can diagnose syntax errors
              // that JHipster's prettier pass flags. Survives across runs.
              try {
                const dumpDir = path.join(os.tmpdir(), 'saathratri-formsvc-dump');
                fs.mkdirSync(dumpDir, { recursive: true });
                fs.writeFileSync(path.join(dumpDir, `${entity.entityFileName}.pre.ts`), content);
                fs.writeFileSync(path.join(dumpDir, `${entity.entityFileName}.post.ts`), result);
              } catch (e) {
                this.log.info(`[sql-angular] dump failed: ${e.message}`);
              }
              return result;
            });

            this.log.info(`[sql-angular] Stripped ${excludedFormRels.length} excluded rel(s) from ${entity.entityFileName} update/form`);
          }

          // Detect vector fields using BOTH the prepared property AND the raw JDL annotation
          // This ensures detection works regardless of generator execution order
          const vectorFields = (entity.fields ?? []).filter(
            f => f.fieldTypeVectorSaathratri || f.options?.customAnnotation?.[0] === 'VECTOR',
          );
          if (vectorFields.length === 0) continue;

          // Ensure vector field metadata is set (in case PREPARING phase didn't run yet)
          for (const vf of vectorFields) {
            if (!vf.fieldTypeVectorSaathratri) {
              vf.fieldTypeVectorSaathratri = true;
            }
            if (!vf.sourceFieldNameSaathratri) {
              const src = vf.fieldName.replace(/Embedding$/, '');
              vf.sourceFieldNameSaathratri = src;
              vf.sourceFieldNameCapitalizedSaathratri = src.charAt(0).toUpperCase() + src.slice(1);
            }
          }

          const listTsFile = `${clientSrcDir}app/entities/${entity.entityFolderName}/list/${entity.entityFileName}.ts`;
          const listHtmlFile = `${clientSrcDir}app/entities/${entity.entityFolderName}/list/${entity.entityFileName}.html`;
          const detailTsFile = `${clientSrcDir}app/entities/${entity.entityFolderName}/detail/${entity.entityFileName}-detail.ts`;
          const { entityInstancePlural } = entity;
          const entityAngularName = entity.entityAngularName || entity.entityClass || entity.name;

          // --- Patch list component ---
          this.editFile(listTsFile, content => {
            // Skip if already fully patched (check for field selection which is the latest addition)
            if (content.includes('aiSearchSelectedFields')) return content;

            // Remove old AI search patch if present (missing field selection support)
            if (content.includes('performAiSearch')) {
              content = content.replace(
                /\n\s*\/\/ Saathratri modification - AI search properties[\s\S]*?\/\/ End Saathratri modification - AI search\n/,
                '\n',
              );
            }

            // 1. Add signal import if not present
            if (!content.includes('signal')) {
              content = content.replace(
                /import \{ (.*?) \} from '@angular\/core';/,
                (match, imports) => `import { ${imports}, signal } from '@angular/core';`,
              );
            }

            // 3. Add FormsModule import for ngModel binding if not present
            if (!content.includes('FormsModule')) {
              content = content.replace(/import \{ (.*?) \} from '@angular\/forms';/, (match, imports) => {
                if (imports.includes('FormsModule')) return match;
                return `import { ${imports}, FormsModule } from '@angular/forms';`;
              });
              // If no @angular/forms import exists, add it
              if (!content.includes('FormsModule')) {
                content = content.replace('import { Component', "import { FormsModule } from '@angular/forms';\nimport { Component");
              }
            }

            // 4. Add FormsModule to component imports array if not present
            if (!content.includes('FormsModule') || !content.match(/imports:\s*\[[\s\S]*?FormsModule/)) {
              content = content.replace(/imports:\s*\[/, 'imports: [FormsModule, ');
            }

            // 5. Add DecimalPipe import and component registration
            content = this._addDecimalPipeImport(content);

            // 6. Add HttpClient inject and AI search properties/methods
            // Find the class body to inject properties (match both "export class" and "export default class")
            const classBodyRegex = /export\s+(?:default\s+)?class\s+\w+[^{]*\{/;
            const classMatch = content.match(classBodyRegex);
            if (classMatch) {
              const insertPos = classMatch.index + classMatch[0].length;

              const entityServiceInstance = `${entity.entityInstance}Service`;

              // Build the default selected fields object
              const fieldEntries = vectorFields.map(vf => `'${vf.fieldName}': true`).join(', ');
              const fieldNamesArray = vectorFields.map(vf => `'${vf.fieldName}'`).join(', ');

              const aiSearchCode = `

  // Saathratri modification - AI search properties
  aiSearchQuery = '';
  aiSearchLoading = signal(false);
  isAiSearchActive = signal(false);
  aiSearchSelectedFields: Record<string, boolean> = { ${fieldEntries} };

  toggleAiSearchField(fieldName: string): void {
    this.aiSearchSelectedFields[fieldName] = !this.aiSearchSelectedFields[fieldName];
  }

  // Public (not private) so member-ordering passes for the public/protected
  // methods declared after this block in the same class.
  getSelectedAiSearchFields(): string[] {
    const allFields = [${fieldNamesArray}];
    const selected = allFields.filter(f => this.aiSearchSelectedFields[f]);
    return selected.length > 0 ? selected : allFields;
  }

  performAiSearch(query: string): void {
    if (!query.trim()) {
      this.clearAiSearch();
      return;
    }
    this.aiSearchLoading.set(true);
    const fields = this.getSelectedAiSearchFields();
    this.${entityServiceInstance}.aiSearch(query.trim(), 20, fields).subscribe({
      next: results => {
        this.${entityInstancePlural}.set(results);
        this.isAiSearchActive.set(true);
        this.aiSearchLoading.set(false);
      },
      error: () => {
        this.aiSearchLoading.set(false);
      },
    });
  }

  clearAiSearch(): void {
    this.aiSearchQuery = '';
    this.isAiSearchActive.set(false);
    this.load();
  }
  // End Saathratri modification - AI search`;

              content = content.slice(0, insertPos) + aiSearchCode + content.slice(insertPos);
            }

            // 7. Add inject import if not present
            if (!content.match(/import\s*\{[^}]*inject[^}]*\}\s*from\s*'@angular\/core'/)) {
              content = content.replace(/import \{ (.*?) \} from '@angular\/core';/, (match, imports) => {
                if (imports.includes('inject')) return match;
                return `import { ${imports}, inject } from '@angular/core';`;
              });
            }

            return content;
          });

          this.log.info(`[sql-angular] Patched ${listTsFile} with AI search and DecimalPipe`);

          // --- Patch list HTML to add vector field checkboxes ---
          if (vectorFields.length > 1) {
            this.editFile(listHtmlFile, content => {
              // Skip if checkboxes already present
              if (content.includes('toggleAiSearchField')) return content;

              // Build checkboxes HTML
              let checkboxesHtml = '\n      <div class="mt-2 d-flex flex-wrap gap-3">';
              checkboxesHtml += '\n        <small class="text-muted me-1">Search in:</small>';
              for (const vf of vectorFields) {
                const label = vf.sourceFieldNameSaathratri || vf.fieldName.replace(/Embedding$/, '');
                checkboxesHtml += `\n        <div class="form-check form-check-inline">`;
                checkboxesHtml += `\n          <input class="form-check-input" type="checkbox" id="aiField_${vf.fieldName}"`;
                checkboxesHtml += `\n                 [checked]="aiSearchSelectedFields['${vf.fieldName}']"`;
                checkboxesHtml += `\n                 (change)="toggleAiSearchField('${vf.fieldName}')">`;
                checkboxesHtml += `\n          <label class="form-check-label" for="aiField_${vf.fieldName}">${label}</label>`;
                checkboxesHtml += `\n        </div>`;
              }
              checkboxesHtml += '\n      </div>';

              // Strategy: find the aiSearchForm's closing </div></form> pair.
              // The pattern is: </div> (closes col-sm-12) followed by </form>.
              // We inject BEFORE that </div> so checkboxes sit inside col-sm-12.
              const formEndRegex = /(<form\s+name="aiSearchForm"[\s\S]*?)(\s*<\/div>\s*<\/form>)/;
              content = content.replace(formEndRegex, `$1${checkboxesHtml}$2`);

              return content;
            });

            this.log.info(`[sql-angular] Patched ${listHtmlFile} with vector field checkboxes`);
          }

          // --- Patch entity service to add aiSearch method ---
          const serviceTsFile = `${clientSrcDir}app/entities/${entity.entityFolderName}/service/${entity.entityFileName}.service.ts`;
          this.editFile(serviceTsFile, content => {
            // Remove old aiSearch method if it lacks fields parameter support
            if (content.includes('aiSearch') && !content.includes('fields?: string[]')) {
              content = content.replace(/\n\s*aiSearch\(query: string, limit: number\)[^}]*\{[\s\S]*?\n\s*\}\n/, '\n');
            }
            if (content.includes('aiSearch')) return content;

            // Add aiSearch method before the closing brace
            const lastBrace = content.lastIndexOf('}');
            if (lastBrace !== -1) {
              const aiSearchMethod = `
  aiSearch(query: string, limit: number, fields?: string[]): Observable<I${entityAngularName}[]> {
    const params: Record<string, string | string[]> = { query, limit: String(limit) };
    if (fields && fields.length > 0) {
      params.fields = fields.join(',');
    }
    return this.http.get<I${entityAngularName}[]>(\`\${this.resourceUrl}/ai-search\`, {
      params,
    });
  }
`;
              content = content.slice(0, lastBrace) + aiSearchMethod + content.slice(lastBrace);

              // Add Observable import if not present
              if (!content.includes('import { Observable }') && !content.match(/import\s*\{[^}]*Observable[^}]*\}/)) {
                content = content.replace(/import \{ HttpClient/, "import { Observable } from 'rxjs';\nimport { HttpClient");
              }
            }
            return content;
          });

          this.log.info(`[sql-angular] Patched ${serviceTsFile} with aiSearch method`);

          // --- Patch detail component for DecimalPipe ---
          this.editFile(detailTsFile, content => {
            return this._addDecimalPipeImport(content);
          });

          this.log.info(`[sql-angular] Patched ${detailTsFile} with DecimalPipe`);

          // --- Patch update component for JsonPipe ---
          const updateTsFile = `${clientSrcDir}app/entities/${entity.entityFolderName}/update/${entity.entityFileName}-update.ts`;
          this.editFile(updateTsFile, content => {
            return this._addJsonPipeImport(content);
          });

          this.log.info(`[sql-angular] Patched ${updateTsFile} with JsonPipe`);

          // --- Patch the list component spec to cover the injected AI-search methods ---
          const fieldNamesArr = JSON.stringify(vectorFields.map(vf => vf.fieldName));
          const firstVf = vectorFields[0].fieldName;
          // The AI-search mocks below build a fake result row `{ id: <literal> }`. The literal must
          // match the entity's primary-key TS type or the spec fails to compile (TS2345) — numeric
          // for Long/Integer PKs, a quoted UUID/string for UUID/String PKs.
          const pk = entity.primaryKey;
          const idIsString = pk ? pk.tsType === 'string' || pk.type === 'String' || pk.type === 'UUID' : false;
          const idLiteral = idIsString ? "'9fec3727-3421-4967-b213-ba36557ca194'" : '19931';
          const listSpecFile = `${clientSrcDir}app/entities/${entity.entityFolderName}/list/${entity.entityFileName}.spec.ts`;
          this.editFile(listSpecFile, content => {
            if (typeof content !== 'string' || content.includes('Saathratri modification - AI search component tests')) return content;
            // The injected AI-search bar renders <fa-icon icon="search"/>; register faSearch in the
            // spec's icon library so the load/sort tests (which trigger change detection) don't fail.
            if (!content.includes('faSearch')) {
              content = content.replace(
                /} from '@fortawesome\/free-solid-svg-icons';/,
                ", faSearch } from '@fortawesome/free-solid-svg-icons';",
              );
              content = content.replace(/library\.addIcons\(([^)]*)\);/, 'library.addIcons($1, faSearch);');
            }
            const tests = `
  // Saathratri modification - AI search component tests
  it('should start with AI search inactive and all vector fields selected', () => {
    expect(comp.isAiSearchActive()).toBe(false);
    expect(comp.getSelectedAiSearchFields()).toEqual(${fieldNamesArr});
  });

  it('should perform AI search and populate results', () => {
    const aiResults = [{ id: ${idLiteral} }];
    vitest.spyOn(service, 'aiSearch').mockReturnValue(of(aiResults));

    comp.performAiSearch('hello world');

    expect(service.aiSearch).toHaveBeenCalledWith('hello world', 20, ${fieldNamesArr});
    expect(comp.${entityInstancePlural}()).toEqual(aiResults);
    expect(comp.isAiSearchActive()).toBe(true);
    expect(comp.aiSearchLoading()).toBe(false);
  });

  it('should toggle the AI search field selection', () => {
    expect(comp.getSelectedAiSearchFields()).toContain('${firstVf}');
    comp.toggleAiSearchField('${firstVf}');
    expect(comp.aiSearchSelectedFields['${firstVf}']).toBe(false);
  });

  it('should clear AI search and reload the list', () => {
    const loadSpy = vitest.spyOn(comp, 'load').mockImplementation(() => {});
    comp.isAiSearchActive.set(true);
    comp.clearAiSearch();
    expect(comp.isAiSearchActive()).toBe(false);
    expect(loadSpy).toHaveBeenCalled();
  });
  // End Saathratri modification - AI search component tests
`;
            const idx = content.lastIndexOf('});');
            if (idx === -1) return content;
            return content.slice(0, idx) + tests + content.slice(idx);
          });
          this.log.info(`[sql-angular] Patched ${listSpecFile} with AI search component tests`);

          // --- Patch the service spec to cover the aiSearch() HTTP call ---
          const serviceSpecFile = `${clientSrcDir}app/entities/${entity.entityFolderName}/service/${entity.entityFileName}.service.spec.ts`;
          this.editFile(serviceSpecFile, content => {
            if (typeof content !== 'string' || content.includes('Saathratri modification - AI search service test')) return content;
            const test = `
    // Saathratri modification - AI search service test
    it('should perform an AI search', () => {
      const aiResults = [{ id: ${idLiteral} }];
      service.aiSearch('hello', 20, ['${firstVf}']).subscribe(resp => (expectedResult = resp));

      const req = httpMock.expectOne(request => request.method === 'GET' && request.url.endsWith('/ai-search'));
      expect(req.request.params.get('query')).toEqual('hello');
      expect(req.request.params.get('limit')).toEqual('20');
      expect(req.request.params.get('fields')).toEqual('${firstVf}');
      req.flush(aiResults);

      expect(expectedResult).toEqual(aiResults);
    });
    // End Saathratri modification - AI search service test
`;
            const idx = content.lastIndexOf('});');
            if (idx === -1) return content;
            return content.slice(0, idx) + test + content.slice(idx);
          });
          this.log.info(`[sql-angular] Patched ${serviceSpecFile} with AI search service test`);
        }
      },

      async wireLazyRelationshipEditButtonsIntoUpdatePage({ application, entities }) {
        // For each entity that carries entityGraphExcludeCustomAnnotation,
        // inject an "Edit {field}" button row above the Cancel/Save buttons in
        // the update page (the upstream JHipster template silently strips
        // these relationships, so there's nothing to replace — we just add a
        // new section). Each button opens LazyRelationshipEditModalComponent
        // for the given excluded relationship; saves PUT immediately,
        // independent of the parent form's Save button.
        if (application.skipClient || !application.databaseTypeSql || !application.applicationTypeMicroservice) {
          return;
        }
        const clientSrcDir = application.clientSrcDir || 'src/main/webapp/';
        const MARKER = 'SAATHRATRI: lazy-load excluded-relationship edit buttons';

        for (const entity of entities) {
          if (entity.builtIn || !entity.entityFolderName || !entity.entityFileName) continue;
          const excluded = getExcludedRelationships(entity);
          if (!excluded.length) continue;

          const blocks = [];
          for (const rel of excluded) {
            const meta = describeExcludedRelationship(entity, rel, entities);
            if (!meta) continue;
            if (meta.relationshipType !== 'many-to-many' || !meta.isInverseSide) continue;
            blocks.push(meta);
          }
          if (!blocks.length) continue;

          const updateHtmlPath = `${clientSrcDir}app/entities/${entity.entityFolderName}/update/${entity.entityFileName}-update.html`;
          const updateTsPath = `${clientSrcDir}app/entities/${entity.entityFolderName}/update/${entity.entityFileName}-update.ts`;

          // ---- update.html: inject section above Cancel/Save buttons ----
          this.editFile(updateHtmlPath, content => {
            if (typeof content !== 'string' || content.includes(MARKER)) return content;

            const buttons = blocks
              .map(meta => {
                const fld = meta.fieldName;
                const labelArg = meta.displayLabelField ? `'${meta.displayLabelField}'` : 'null';
                const pathArg = Array.isArray(meta.displayLabelPath)
                  ? `'${meta.displayLabelPath.map(p => p.join('.')).join(' ')}'`
                  : 'null';
                const plural = meta.otherEntityClassPlural;
                return (
                  `        <button type="button" class="btn btn-info btn-sm me-2 mb-2" ` +
                  `(click)="openLazyRelationshipEdit('${fld}', '${plural}', ${labelArg}, ${pathArg})">` +
                  `Edit ${plural}</button>`
                );
              })
              .join('\n');

            const section =
              `\n      <!-- ${MARKER} -->\n` +
              `      <div class="form-group mb-3">\n` +
              `        <label class="form-label fw-bold">Related collections (saved independently of this form):</label><br />\n${
                buttons
              }\n` +
              `      </div>\n`;

            // Anchor: the <div> that wraps the Cancel button. The whole row
            // is `<div>\n        <button type="button" id="cancel-save" ...`,
            // so we look for that id and insert before its enclosing <div>.
            // mem-fs buffers on Windows can be CRLF — `\r?\n` tolerates either.
            // The upstream JHipster buffer at this point is pre-prettier and uses
            // wider indentation than the final on-disk file. Match the indent
            // generically (any whitespace), capture the leading whitespace so we
            // can re-emit `<div>` with the same indent, and tolerate CRLF.
            const anchorRe = /(\r?\n)([\s]*)<div>(\r?\n[\s]*<button type="button" id="cancel-save")/;
            const m = content.match(anchorRe);
            if (!m) {
              const idx = content.indexOf('cancel-save');
              const window = idx >= 0 ? JSON.stringify(content.slice(Math.max(0, idx - 80), idx + 30)) : '<no cancel-save substring>';
              this.log.warn(
                `[sql-angular] lazy-load: ${entity.entityClass} -> cancel-save anchor not found in ${updateHtmlPath}, content len=${content.length}, around-cancel-save=${window}`,
              );
              return content;
            }
            const leadingNl = m[1];
            const indent = m[2];
            const tail = m[3];
            // Re-indent our injected section to match the surrounding form's level.
            const indentedSection = section
              .split('\n')
              .map((line, idx) => (idx === 0 ? line : line.length ? indent + line.replace(/^ {6}/, '') : line))
              .join('\n');
            return content.replace(anchorRe, `${leadingNl + indentedSection + leadingNl + indent}<div>${tail}`);
          });

          // ---- update.ts: add openLazyRelationshipEdit handler + imports ----
          this.editFile(updateTsPath, content => {
            if (typeof content !== 'string' || content.includes(MARKER)) return content;

            const importBlock = [
              `import { NgbModal } from '@ng-bootstrap/ng-bootstrap';`,
              `import { ApplicationConfigService } from 'app/core/config/application-config.service';`,
              `import { LazyRelationshipEditModalComponent } from 'app/shared/lazy-relationship/lazy-relationship-edit-modal';`,
            ];
            for (const imp of importBlock) {
              if (!content.includes(imp)) {
                content = content.replace(/((?:^import [^\n]+;\n)+)/m, m => `${m}${imp}\n`);
              }
            }

            // Make sure inject() is on the @angular/core named imports.
            const angularCoreImportRe = /import\s*\{([^}]*)\}\s*from\s*['"]@angular\/core['"]\s*;/;
            const m = content.match(angularCoreImportRe);
            if (m) {
              const names = m[1]
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);
              if (!names.includes('inject')) {
                names.push('inject');
                names.sort();
                content = content.replace(angularCoreImportRe, `import { ${names.join(', ')} } from '@angular/core';`);
              }
            } else {
              content = content.replace(/((?:^import [^\n]+;\n)+)/m, m => `${m}import { inject } from '@angular/core';\n`);
            }

            const handler = `
  // ---- ${MARKER} ----
  // Base URL is resolved via ApplicationConfigService — same path the
  // generated entity service uses — so gateway/microfrontend routing is
  // honoured (raw '/api/...' bypasses it and 404s).
  private readonly lazyEditModalService = inject(NgbModal);
  private readonly lazyEditAppConfig = inject(ApplicationConfigService);
  protected readonly lazyEditParentApiUrl = this.lazyEditAppConfig.getEndpointFor('api/${entity.entityApiUrl}', '${application.baseName}');

  openLazyRelationshipEdit(
    fieldName: string,
    fieldDisplayName: string,
    displayLabelField: string | null,
    displayLabelPath: string | null,
  ): void {
    // Parent id comes from the form's id field; only meaningful on edit, not create.
    const parentId = this.editForm?.get('id')?.value;
    if (!parentId) {
      // eslint-disable-next-line no-console
      console.warn('[lazy-load] cannot edit ' + fieldName + ': parent id missing (still in create flow?)');
      return;
    }
    const modal = this.lazyEditModalService.open(LazyRelationshipEditModalComponent, { size: 'lg', backdrop: 'static' });
    modal.componentInstance.parentApiUrl = this.lazyEditParentApiUrl;
    modal.componentInstance.parentId = parentId;
    modal.componentInstance.fieldName = fieldName;
    modal.componentInstance.fieldDisplayName = fieldDisplayName;
    modal.componentInstance.displayLabelField = displayLabelField;
    modal.componentInstance.displayLabelPath = displayLabelPath;
  }
  // ---- end ${MARKER} ----`;

            const lastBraceIdx = content.lastIndexOf('}');
            if (lastBraceIdx < 0) return content;
            return `${content.slice(0, lastBraceIdx) + handler}\n${content.slice(lastBraceIdx)}`;
          });
        }
      },

      async wireLazyRelationshipReadButtonsIntoDetailPage({ application, entities }) {
        // For each entity carrying entityGraphExcludeCustomAnnotation, replace
        // the inline `<dd>...@for(...)...</dd>` for each excluded relationship
        // in the detail page with a "View {field}" button that opens the
        // shared LazyRelationshipReadModalComponent. Also injects the matching
        // `openLazyRelationship(...)` handler + ngb-modal/import wiring into
        // the detail.ts.
        //
        // Scope guards: same as the backend hook (SQL microservices only,
        // skip entities without the annotation, skip non-inverse-MtM rels).
        if (application.skipClient || !application.databaseTypeSql || !application.applicationTypeMicroservice) {
          return;
        }
        const clientSrcDir = application.clientSrcDir || 'src/main/webapp/';
        const MARKER = 'SAATHRATRI: lazy-load excluded-relationship buttons';

        for (const entity of entities) {
          if (entity.builtIn || !entity.entityFolderName || !entity.entityFileName) continue;
          const excluded = getExcludedRelationships(entity);
          if (!excluded.length) continue;

          // Resolve per-relationship metadata; only inverse-MtM survives the
          // backend filter so we mirror that here to keep the UI in sync.
          const blocks = [];
          for (const rel of excluded) {
            const meta = describeExcludedRelationship(entity, rel, entities);
            if (!meta) continue;
            if (meta.relationshipType !== 'many-to-many' || !meta.isInverseSide) continue;
            blocks.push(meta);
          }
          if (!blocks.length) continue;

          const detailHtmlPath = `${clientSrcDir}app/entities/${entity.entityFolderName}/detail/${entity.entityFileName}-detail.html`;
          const detailTsPath = `${clientSrcDir}app/entities/${entity.entityFolderName}/detail/${entity.entityFileName}-detail.ts`;
          const entityRefVar = `${entity.entityInstance}Ref`;

          // ---- detail.html: replace each excluded field's <dd>...@for...</dd> ----
          this.editFile(detailHtmlPath, content => {
            if (typeof content !== 'string') return content;
            let next = content;
            for (const meta of blocks) {
              const fld = meta.fieldName;
              const safeFld = fld.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              // Match the <dd> wrapper around the @for that targets {entityRefVar}.{fld}.
              // Tolerates whitespace + the variations in the upstream JHipster
              // template (track $index, let last = $last, link rendering, etc.).
              const re = new RegExp(`<dd>\\s*@for\\s*\\(\\s*\\w+\\s+of\\s+${entityRefVar}\\.${safeFld}[\\s\\S]*?\\}\\s*</dd>`);
              if (!re.test(next)) {
                this.log.warn(
                  `[sql-angular] lazy-load: ${entity.entityClass}.${fld} -> @for block not found in ${detailHtmlPath}, skipping replacement`,
                );
                continue;
              }
              const labelArg = meta.displayLabelField ? `'${meta.displayLabelField}'` : 'null';
              const pathArg = Array.isArray(meta.displayLabelPath) ? `'${meta.displayLabelPath.map(p => p.join('.')).join(' ')}'` : 'null';
              const titlePlural = meta.otherEntityClassPlural;
              const replacement =
                `<dd>\n            <button type="button" class="btn btn-info btn-sm" ` +
                `(click)="openLazyRelationship('${fld}', '${titlePlural}', ${labelArg}, ${pathArg})" ` +
                `title="View ${titlePlural}">\n              ` +
                `<span jhiTranslate="entity.action.view">View</span>\n            </button>\n          </dd>`;
              next = next.replace(re, replacement);
            }
            // Drop a marker comment at the very top so re-runs short-circuit.
            if (!next.includes(MARKER)) {
              next = `<!-- ${MARKER} -->\n${next}`;
            }
            return next;
          });

          // ---- detail.ts: add the openLazyRelationship method + imports ----
          this.editFile(detailTsPath, content => {
            if (typeof content !== 'string' || content.includes(MARKER)) return content;

            // 1. Add imports right after the last existing `import ... ;` line.
            const importBlock = [
              `import { NgbModal } from '@ng-bootstrap/ng-bootstrap';`,
              `import { ApplicationConfigService } from 'app/core/config/application-config.service';`,
              `import { LazyRelationshipReadModalComponent } from 'app/shared/lazy-relationship/lazy-relationship-read-modal';`,
            ];
            for (const imp of importBlock) {
              if (!content.includes(imp)) {
                content = content.replace(/((?:^import [^\n]+;\n)+)/m, m => `${m}${imp}\n`);
              }
            }

            // 2. Inject the modalService inject() + handler method right
            //    before the class's closing brace. Handler is parameterised at
            //    call site so a single method serves every excluded field.
            //    Base URL is resolved via ApplicationConfigService — same path
            //    the generated entity service uses — so the gateway/microfrontend
            //    routing is honoured (raw '/api/...' bypasses it and 404s).
            const handler = `
  // ---- ${MARKER} ----
  private readonly lazyModalService = inject(NgbModal);
  private readonly lazyAppConfig = inject(ApplicationConfigService);
  protected readonly lazyParentApiUrl = this.lazyAppConfig.getEndpointFor('api/${entity.entityApiUrl}', '${application.baseName}');

  openLazyRelationship(
    fieldName: string,
    fieldDisplayName: string,
    displayLabelField: string | null,
    displayLabelPath: string | null,
  ): void {
    const ref = this.${entity.entityInstance}();
    if (!ref?.id) return;
    const modal = this.lazyModalService.open(LazyRelationshipReadModalComponent, { size: 'lg', backdrop: 'static' });
    modal.componentInstance.parentApiUrl = this.lazyParentApiUrl;
    modal.componentInstance.parentId = ref.id;
    modal.componentInstance.fieldName = fieldName;
    modal.componentInstance.fieldDisplayName = fieldDisplayName;
    modal.componentInstance.displayLabelField = displayLabelField;
    modal.componentInstance.displayLabelPath = displayLabelPath;
  }
  // ---- end ${MARKER} ----`;

            // Make sure `inject` is imported from @angular/core. Upstream
            // detail.ts has `import { Component, input } from '@angular/core';`
            // by default — `inject` is NOT on that list, so we either need to
            // add it to the existing named-imports list or add a fresh import.
            const angularCoreImportRe = /import\s*\{([^}]*)\}\s*from\s*['"]@angular\/core['"]\s*;/;
            const m = content.match(angularCoreImportRe);
            if (m) {
              const names = m[1]
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);
              if (!names.includes('inject')) {
                names.push('inject');
                names.sort();
                content = content.replace(angularCoreImportRe, `import { ${names.join(', ')} } from '@angular/core';`);
              }
            } else {
              content = content.replace(/((?:^import [^\n]+;\n)+)/m, m => `${m}import { inject } from '@angular/core';\n`);
            }

            const lastBraceIdx = content.lastIndexOf('}');
            if (lastBraceIdx < 0) return content;
            return `${content.slice(0, lastBraceIdx) + handler}\n${content.slice(lastBraceIdx)}`;
          });
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

  /**
   * Adds DecimalPipe import from @angular/common and registers it in the component's imports array.
   * Used for vector field display with number formatting in list and detail templates.
   */
  _addDecimalPipeImport(content) {
    if (content.includes('DecimalPipe')) return content;

    // Add DecimalPipe to the @angular/common import statement, or create one
    if (content.match(/import\s*\{[^}]*\}\s*from\s*'@angular\/common';/)) {
      content = content.replace(/import \{ (.*?) \} from '@angular\/common';/, (match, imports) => {
        return `import { ${imports}, DecimalPipe } from '@angular/common';`;
      });
    } else {
      // Add a new import for @angular/common with DecimalPipe
      content = content.replace(/import \{ Component/, "import { DecimalPipe } from '@angular/common';\nimport { Component");
    }

    // Add DecimalPipe to the component imports array
    content = content.replace(/imports:\s*\[/, 'imports: [DecimalPipe, ');

    return content;
  }

  /**
   * Adds JsonPipe import from @angular/common and registers it in the component's imports array.
   * Used for vector field full display with JSON formatting in update templates.
   */
  _addJsonPipeImport(content) {
    if (content.includes('JsonPipe')) return content;

    // Add JsonPipe to the @angular/common import statement, or create one
    if (content.match(/import\s*\{[^}]*\}\s*from\s*'@angular\/common';/)) {
      content = content.replace(/import \{ (.*?) \} from '@angular\/common';/, (match, imports) => {
        return `import { ${imports}, JsonPipe } from '@angular/common';`;
      });
    } else {
      content = content.replace(/import \{ Component/, "import { JsonPipe } from '@angular/common';\nimport { Component");
    }

    // Add JsonPipe to the component imports array
    content = content.replace(/imports:\s*\[/, 'imports: [JsonPipe, ');

    return content;
  }
}
