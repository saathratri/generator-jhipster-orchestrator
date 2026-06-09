import BaseApplicationGenerator from "generator-jhipster/generators/base-application";

import { cassandraSpringBootUtils } from "../cassandra-spring-boot/cassandra-spring-boot-utils.js";

// Escape a string for safe literal use inside a RegExp.
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Build the composite-key URL suffix used by the REST endpoint / Angular service, e.g.
// `${blog.compositeId.entityTypeId}/${blog.compositeId.yearOfDateAdded}/...`.
// The Cypress test deletes from the raw POST response body (numeric dates already), so,
// unlike the Angular service, no dayjs/`copy` conversion is needed.
function buildCompositeKeyUrlSuffix(instanceVar, primaryKeySaathratri) {
  return primaryKeySaathratri.ids
    .map(
      (pk) => `\${${instanceVar}.${primaryKeySaathratri.name}.${pk.fieldName}}`,
    )
    .join("/");
}

// A static v4-like UUID used as the sample value for UUID/TIMEUUID-typed fields. Jackson
// requires a parseable UUID string for cassandra UUID columns — the test-samples
// template's `'sample-<fieldName>-1'` strings are fine for in-memory Angular models but
// fail the backend's `UUID.fromString()` with "Failed to read request" on the POST body.
// TIMEUUID fields are server-overwritten via `Uuids.timeBased()` so the value here is
// disposable; v4 vs v1 doesn't matter as long as it parses.
const SAMPLE_UUID = "00000000-0000-4000-8000-000000000001";

// Sample value for an entity field, used inside a TypeScript object literal — numbers stay
// numeric, UUIDs use a valid hex format, everything else is a `'sample-<fieldName>-1'`
// string. Mirrors the test-samples template's sampleValue() with the UUID exception
// needed for Cypress's real HTTP POSTs.
function sampleObjValue(field) {
  const t = field.fieldType;
  if (
    t === "Long" ||
    t === "Integer" ||
    t === "Double" ||
    t === "Float" ||
    t === "BigDecimal"
  ) {
    return "1001";
  }
  if (t === "Boolean") return "true";
  if (t === "UUID") return `'${SAMPLE_UUID}'`;
  return `'sample-${field.fieldName}-1'`;
}

// Sample value as a quoted string suitable for cy.type() (which only accepts strings).
function sampleTypeArg(field) {
  const t = field.fieldType;
  if (
    t === "Long" ||
    t === "Integer" ||
    t === "Double" ||
    t === "Float" ||
    t === "BigDecimal"
  ) {
    return "'1001'";
  }
  if (t === "Boolean") return "'true'";
  if (t === "UUID") return `'${SAMPLE_UUID}'`;
  return `'sample-${field.fieldName}-1'`;
}

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
        // Ensure entity.primaryKeySaathratri (composite-key metadata) is populated even if
        // this generator's task runs before the cassandra-spring-boot/-angular ones.
        // Idempotent: the util no-ops when the attribute is already set.
        cassandraSpringBootUtils.setSaathratriPrimaryKeyAttributesOnEntityAndFields(
          entity,
        );
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
      async writingTemplateTask() {},
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
        // The cassandra-angular generator restructures the navbar from upstream JHipster's
        // single `[data-cy="entity"]` flat dropdown into per-microfrontend dropdowns
        // (e.g. `[data-cy="cassandrablogMenu"]`). The upstream Cypress
        // `support/commands.ts` still declares `entityItemSelector = '[data-cy="entity"]'`,
        // so `clickOnEntityMenuItem` (used by every entity spec's beforeEach) can't find
        // the dropdown and all entity tests fail with
        // "Expected to find element: `[data-cy=\"entity\"]`, but never found it."
        //
        // Patch this microservice's commands.ts to point entityItemSelector at its own
        // microfrontend dropdown. Each microservice's Cypress suite runs against the
        // gateway, so it needs to open *its own* named dropdown to see its entities.
        const cypressDir = application.cypressDir;
        if (!cypressDir) return;
        if (!application.applicationTypeMicroservice) return;

        const commandsPath = `${cypressDir}support/commands.ts`;
        if (!this.existsDestination(commandsPath)) return;

        this.editFile(commandsPath, (content) => {
          if (content.includes(`"${application.baseName}Menu"`)) return content;
          return content.replace(
            `export const entityItemSelector = '[data-cy="entity"]';`,
            `export const entityItemSelector = '[data-cy="${application.baseName}Menu"]';`,
          );
        });

        // Patch clickOnEntityMenuItem in support/navbar.ts. Two issues to fix:
        //
        // 1. Selector chain: upstream chains `.find(entityItemSelector).find('.dropdown-item[href=...]')`
        //    expecting the items to be CHILDREN of the data-cy="entity" element. The
        //    cassandra-angular blueprint's per-microfrontend navbar puts data-cy on the
        //    `<a ngbDropdownToggle>` element while the items live in a SIBLING
        //    `<ul ngbDropdownMenu>`. So `.find(entityItemSelector).find('.dropdown-item')`
        //    finds nothing — the items are outside the toggle's subtree. Drop the
        //    intermediate `.find(entityItemSelector)` and search from `navbarSelector`
        //    so the sibling `<ul>` is reachable.
        //
        // 2. Timeout: the per-microfrontend dropdowns populate async via module federation
        //    (loadMicrofrontendsEntities → loadNavbarItems → remoteEntry.js fetch → signal
        //    set → `*ngFor` render). Cypress's default 4s retry isn't enough on cold load.
        //    Extend to 30s.
        const navbarPath = `${cypressDir}support/navbar.ts`;
        if (this.existsDestination(navbarPath)) {
          this.editFile(navbarPath, (content) => {
            if (content.includes("/* SAATHRATRI mf nav */")) return content;
            return content.replace(
              /cy\s*\.get\(navbarSelector\)\s*\.find\(entityItemSelector\)\s*\.find\(`\.dropdown-item\[href="\/\$\{entityName\}"\]`(?:,\s*\/\*\s*SAATHRATRI mf timeout\s*\*\/\s*\{\s*timeout:\s*\d+\s*\})?\)\s*\.click\(\)/,
              'cy\n    .get(navbarSelector)\n    .find(`.dropdown-item[href="/${entityName}"]`, /* SAATHRATRI mf nav */ { timeout: 30000 })\n    .click()',
            );
          });
        }
      },
    });
  }

  get [BaseApplicationGenerator.POST_WRITING_ENTITIES]() {
    return this.asPostWritingEntitiesTaskGroup({
      async postWritingEntitiesTemplateTask({ application, entities }) {
        if (!application.databaseTypeCassandra) return;
        // Upstream's Cypress entity spec assumes a single primary-key path segment for the
        // DELETE cleanup and intercept. For Cassandra composite keys the REST endpoint and
        // the Angular service use one path segment per key field
        // (e.g. /{entityTypeId}/{yearOfDateAdded}/{arrivalDate}/{blogId}). Without this patch
        // the cleanup hits /.../undefined and the DELETE intercept glob never matches.
        const cypressDir = application.cypressDir;
        if (!cypressDir) return;

        // Map every composite-key entity's REST url -> its composite-key metadata, so we can
        // also fix DELETE cleanups for required *related* composite entities, not just self.
        const compositeByApiUrl = new Map();
        for (const entity of entities) {
          if (entity.primaryKeySaathratri?.composite) {
            compositeByApiUrl.set(
              entity.entityApiUrl,
              entity.primaryKeySaathratri,
            );
          }
        }
        // NOTE: do NOT early-return when there are no composite-key entities. Single-key-only
        // apps (e.g. cassandrastore: product, report) still need the (c) timeout-bump and
        // (d) intercept-widen patches in the loop further below to survive microfrontend
        // cold-load. The composite-specific loop right below is already per-entity guarded,
        // so it harmlessly no-ops when nothing is composite.

        for (const entity of entities) {
          if (!entity.primaryKeySaathratri?.composite) continue;

          const specPath = `${cypressDir}e2e/entity/${entity.entityFileName}.cy.ts`;
          if (!this.existsDestination(specPath)) continue;

          this.editFile(specPath, (content) => {
            // 1. Fix every DELETE-cleanup template-literal URL (self + required relations):
            //    `.../<apiUrl>/${someVar.<singleKey>}` -> `.../<apiUrl>/${someVar.compositeId.k1}/...`
            for (const [apiUrl, primaryKeySaathratri] of compositeByApiUrl) {
              const cleanupRe = new RegExp(
                `(${escapeRegExp(apiUrl)}/)\\$\\{(\\w+)\\.[^\`]*?\\}\``,
                "g",
              );
              content = content.replace(
                cleanupRe,
                (match, prefix, instanceVar) =>
                  `${prefix}${buildCompositeKeyUrlSuffix(instanceVar, primaryKeySaathratri)}\``,
              );
            }

            // 2. Widen this entity's DELETE intercept glob so it matches the multi-segment
            //    URL: '/.../<apiUrl>/*' -> '/.../<apiUrl>/*/*/*/*' (one '*' per key field).
            const stars = entity.primaryKeySaathratri.ids
              .map(() => "*")
              .join("/");
            const interceptRe = new RegExp(
              `${escapeRegExp(entity.entityApiUrl)}/\\*'`,
              "g",
            );
            content = content.replace(
              interceptRe,
              `${entity.entityApiUrl}/${stars}'`,
            );

            return content;
          });
        }

        // ---------------------------------------------------------------------------
        // Additional patches for POST body + form-fill — separate iteration covers
        // BOTH composite-key entities and single-key cassandra entities (the upstream
        // template's generateTestEntity() and form-fill loop both skip JHipster id
        // fields that are auto-generated, leaving the POST body without compositeId/id
        // and the form without the required field, causing 500/400 errors and a
        // permanently-disabled Save button).
        // ---------------------------------------------------------------------------
        for (const entity of entities) {
          if (entity.builtIn || !entity.entityFileName) continue;

          const specPath = `${cypressDir}e2e/entity/${entity.entityFileName}.cy.ts`;
          if (!this.existsDestination(specPath)) continue;

          const idField = entity.fields?.find((f) => f.id);
          // NOTE: do NOT `continue` when idField is missing. Single-key Cassandra entities
          // whose PK is not an @Id-annotated entity field (e.g. Product, Report) have no
          // idField, but they still need the (c) timeout bump + (d) intercept-widen patches
          // below to survive microfrontend cold-load. Only the id-dependent (a)/(b) blocks
          // are guarded on idField.

          this.editFile(specPath, (content) => {
            const sampleVar = `${entity.entityInstance}Sample`;

            // (a) Sample body: inject `compositeId: {...}` (composite) or the id field
            // (single-key). Idempotent — skip if already present.
            if (entity.primaryKeySaathratri?.composite) {
              if (!content.includes(`${sampleVar} = { compositeId:`)) {
                const compositeIdLit = entity.primaryKeySaathratri.ids
                  .map((f) => `${f.fieldName}: ${sampleObjValue(f)}`)
                  .join(", ");
                content = content.replace(
                  `const ${sampleVar} = {`,
                  `const ${sampleVar} = { compositeId: { ${compositeIdLit} },`,
                );
              }
            } else if (idField) {
              const idPropRe = new RegExp(
                `${escapeRegExp(sampleVar)}\\s*=\\s*\\{\\s*${escapeRegExp(idField.fieldName)}\\b`,
              );
              if (!idPropRe.test(content)) {
                content = content.replace(
                  `const ${sampleVar} = {`,
                  `const ${sampleVar} = { ${idField.fieldName}: ${sampleObjValue(idField)},`,
                );
              }
            }

            // (b) Form fill in `should create an instance of <X>`: inject a `.type()` for
            // the @Id-marked field if it isn't already typed. Upstream's form-fill loop
            // excludes fields where `field.id && field.autoGenerate` — so UUID @Id fields
            // (Tag.id, SaathratriEntity2.entityTypeId) are missing but String/Long @Id
            // fields (Blog.category) are already there.
            const formFillStart = `it('should create an instance of ${entity.entityAngularName}', () => {`;
            const blockStart = idField ? content.indexOf(formFillStart) : -1;
            if (blockStart !== -1) {
              const saveClickIdx = content.indexOf(
                "cy.get(entityCreateSaveButtonSelector)",
                blockStart,
              );
              const block =
                saveClickIdx > -1
                  ? content.slice(blockStart, saveClickIdx)
                  : "";
              const idSelectorMarker = `[data-cy="${idField.fieldName}"]`;

              if (!block.includes(idSelectorMarker)) {
                const injection =
                  `\n      cy.get(\`[data-cy="${idField.fieldName}"]\`).type(${sampleTypeArg(idField)});\n` +
                  `      cy.get(\`[data-cy="${idField.fieldName}"]\`).should('have.value', ${sampleTypeArg(idField)});\n`;
                content = content.replace(
                  formFillStart,
                  formFillStart + injection,
                );
              }
            }

            // (c) Bump `cy.wait('@entitiesRequest')` and `cy.wait('@entitiesRequestInternal')`
            // timeouts from the default 5s to 30s. The lazy-loaded cassandrablog/cassandrastore
            // microfrontend route only fires its GET after module federation registers the
            // remote — in Cypress's cold-load this can exceed 5s and the wait times out
            // "No request ever occurred." Works fine in a normal browser.
            content = content.replace(
              /cy\.wait\('@entitiesRequest'\)/g,
              "cy.wait('@entitiesRequest', { timeout: 30000 })",
            );
            content = content.replace(
              /cy\.wait\('@entitiesRequestInternal'\)/g,
              "cy.wait('@entitiesRequestInternal', { timeout: 30000 })",
            );

            // (c.5) Strip form-fill lines for MAP/SET fields. The cassandra blueprint
            // generates custom Angular widgets for MAP<TEXT, TEXT/DECIMAL/BOOLEAN/BIGINT>
            // and SET<TEXT> (key/value rows, toggles, date pickers) — these don't expose
            // a single `<input data-cy="<fieldName>">`, so the upstream template's
            // `cy.get('[data-cy="<map>"]').type(...)` times out with
            // "Expected to find element: `[data-cy=\"addOnDetailsText\"]`, but never found it."
            // MAP/SET columns aren't required in the JDL, so removing the fill lines
            // entirely leaves the form valid for submit. Detection: first element of
            // `customAnnotation` is `CassandraType.Name.MAP` or `CassandraType.Name.SET`.
            const mapSetFields = (entity.fields ?? []).filter((f) => {
              const ann = f.options?.customAnnotation?.[0];
              return (
                ann === "CassandraType.Name.MAP" ||
                ann === "CassandraType.Name.SET"
              );
            });
            for (const f of mapSetFields) {
              // Remove any whole line that does `cy.get(`[data-cy="<fieldName>"]`).<anything>;`
              // — covers .type/.should/.click/.invoke chains regardless of arguments.
              const lineRe = new RegExp(
                `^\\s*cy\\.get\\(\`\\[data-cy="${escapeRegExp(f.fieldName)}"\\]\`\\)[^;]+;\\s*\\n`,
                "gm",
              );
              content = content.replace(lineRe, "");
            }

            // (c.6) UTC_DATETIME fields use a custom `<app-date-time>` component with a
            // sibling "Generate" button (only rendered when @if (isNew)). The upstream
            // form-fill's `cy.get('[data-cy="<field>"]').type(...)` fails because the
            // datetime widget doesn't expose a single matching input. Strip those lines
            // and instead click the Generate button — for composite-key UTC_DATETIME
            // fields (e.g. Post.addedDateTime) this is REQUIRED so the form passes
            // validation; for optional UTC_DATETIME fields it's harmless. Detection:
            // `customAnnotation` array contains "UTC_DATETIME".
            const dateTimeFields = (entity.fields ?? []).filter((f) => {
              const ann = f.options?.customAnnotation;
              if (!Array.isArray(ann) || !ann.includes("UTC_DATETIME"))
                return false;
              // Exclude MAP<DAYJS> / SET<DAYJS> — those wrap the datetime inside a
              // widget component, so there's no top-level <app-date-time> to drive
              // and no `<fieldName>-{date,hours,minutes,ampm}` scalar data-cy.
              return (
                ann[0] !== "CassandraType.Name.MAP" &&
                ann[0] !== "CassandraType.Name.SET"
              );
            });
            for (const f of dateTimeFields) {
              const lineRe = new RegExp(
                `^\\s*cy\\.get\\(\`\\[data-cy="${escapeRegExp(f.fieldName)}"\\]\`\\)[^;]+;\\s*\\n`,
                "gm",
              );
              content = content.replace(lineRe, "");
            }
            if (dateTimeFields.length > 0) {
              // Inject Generate-button clicks immediately before the Save button click
              // in the `should create an instance of X` test. The Generate button is a
              // sibling of <app-date-time fieldName="X">, so scope via parent().
              const formFillStart = `it('should create an instance of ${entity.entityAngularName}', () => {`;
              const blockStart = content.indexOf(formFillStart);
              if (blockStart !== -1) {
                const saveClickRe =
                  /^([ \t]+)cy\.get\(entityCreateSaveButtonSelector\)\.click\(\);/m;
                const block = content.slice(blockStart);
                const saveMatch = block.match(saveClickRe);
                if (saveMatch) {
                  const indent = saveMatch[1];
                  const generateLines = dateTimeFields
                    .map(
                      (f) =>
                        // The <app-date-time> component now hosts its own Generate
                        // button (data-cy="<field>-generate") that fills date / hours
                        // / minutes / amPm with the current timestamp via the
                        // component's generateDateTime() method. Click it directly
                        // — no need to walk the DOM up to the parent.
                        `${indent}cy.get(\`[data-cy="${f.fieldName}-generate"]\`).click({ force: true });`,
                    )
                    .join("\n");
                  const saveClickIdx = blockStart + block.indexOf(saveMatch[0]);
                  content = `${
                    content.slice(0, saveClickIdx) + generateLines
                  }\n\n${content.slice(saveClickIdx)}`;
                }
              }

              // (c.7) Emit a second `… date-time widget inputs work` smoke test that
              // verifies the data-cy hooks on the <app-date-time> sub-inputs are wired
              // and accept input. This complements the Generate-shortcut test in
              // (c.6): if the smoke test fails, the data-cy hooks regressed; if (c.6)
              // fails, the Generate button regressed. Together they cover both code
              // paths users actually hit. Smoke test doesn't Save — scalar field fills
              // would be duplicated noise; we only assert the widget itself behaves.
              const firstTestEnd = content.indexOf("\n    });\n", blockStart);
              if (firstTestEnd !== -1) {
                const widgetTests = dateTimeFields
                  .map((f) => {
                    const fn = f.fieldName;
                    return [
                      `    it('should accept input on the ${fn} date-time widget sub-inputs', () => {`,
                      // hours/minutes have an `(input)` handler that runs padZero on
                      // every keystroke, replacing the value mid-type — typing '10'
                      // character-by-character lands as '01' because the FIRST '1'
                      // becomes '01' before Cypress sends the '0', which then can't
                      // land at the expected cursor position. Use `.invoke('val', …)`
                      // to set the value atomically and `.trigger('input')` to fire
                      // the listener once with the final value. This mirrors a paste,
                      // exercises the same DOM path, and is the cypress idiom for
                      // inputs with re-rendering handlers.
                      `      cy.get(\`[data-cy="${fn}-hours"]\`).invoke('val', '10').trigger('input', { force: true });`,
                      `      cy.get(\`[data-cy="${fn}-hours"]\`).should('have.value', '10');`,
                      ``,
                      `      cy.get(\`[data-cy="${fn}-minutes"]\`).invoke('val', '30').trigger('input', { force: true });`,
                      `      cy.get(\`[data-cy="${fn}-minutes"]\`).should('have.value', '30');`,
                      ``,
                      // Required UTC_DATETIME composite-key fields render a
                      // red-asterisk `<span class="mdc-floating-label--required">`
                      // that covers the <mat-select> until first focus — force the
                      // open click. Force the option click too: for a widget low on the
                      // page the CDK overlay opens with the option's center off-screen /
                      // covered, so Cypress's actionability check ("center hidden from
                      // view") blocks an unforced click.
                      `      cy.get(\`[data-cy="${fn}-ampm"]\`).click({ force: true });`,
                      `      cy.get('mat-option').contains('AM').click({ force: true });`,
                      `      cy.get(\`[data-cy="${fn}-ampm"]\`).should('contain', 'AM');`,
                      `    });`,
                    ].join("\n");
                  })
                  .join("\n\n");
                const insertAt = firstTestEnd + "\n    });".length;
                content = `${content.slice(0, insertAt)}\n\n${
                  widgetTests
                }${content.slice(insertAt)}`;
              }
            }

            // (c.8) Emit per-widget smoke tests for SET<TEXT> and MAP<TEXT, *>
            // custom Angular widgets. The wrappers all expose data-cy hooks of the
            // form `<fieldName>-add-{key|value|toggle|button}`. Tests verify the
            // Add-row inputs accept input and the Add button responds — narrow
            // checks that catch data-cy regressions without trying to drive the
            // full add/edit/delete cycle.
            const widgetTestsForEntity = [];
            for (const f of mapSetFields) {
              const fn = f.fieldName;
              const ann = f.options?.customAnnotation || [];
              const mapInner = ann[1]; // CassandraType.Name.TEXT/DECIMAL/BOOLEAN/BIGINT
              const isSet = ann[0] === "CassandraType.Name.SET";
              const isMap = ann[0] === "CassandraType.Name.MAP";

              if (isSet) {
                widgetTestsForEntity.push(
                  [
                    `    it('should accept input on the ${fn} SET widget add row', () => {`,
                    `      cy.get(\`[data-cy="${fn}-add-value"]\`).type('sample-${fn}-1');`,
                    `      cy.get(\`[data-cy="${fn}-add-value"]\`).should('have.value', 'sample-${fn}-1');`,
                    `      cy.get(\`[data-cy="${fn}-add-button"]\`).should('not.be.disabled');`,
                    `    });`,
                  ].join("\n"),
                );
              } else if (isMap && mapInner === "CassandraType.Name.BOOLEAN") {
                // The MAP<BOOLEAN> Add-row's `newValue` formControl starts at `null`
                // with `Validators.required`. The mat-slide-toggle's interactive
                // element is a `<button role="switch">` INSIDE the host — Cypress
                // clicks on the `[data-cy="…-add-toggle"]` host (even with
                // `{ force: true }`) don't propagate down into the inner button,
                // so the toggle never fires its change event. Drill into
                // `[data-cy="…-add-toggle"] button` and click that. Two clicks
                // (null → on → off) guarantee the ControlValueAccessor commits a
                // non-null value to the form regardless of MDC's starting visual
                // state, so the Add button becomes enabled.
                widgetTestsForEntity.push(
                  [
                    `    it('should accept input on the ${fn} MAP<BOOLEAN> widget add row', () => {`,
                    `      cy.get(\`[data-cy="${fn}-add-key"]\`).type('sample-key');`,
                    `      cy.get(\`[data-cy="${fn}-add-key"]\`).should('have.value', 'sample-key');`,
                    `      cy.get(\`[data-cy="${fn}-add-toggle"] button\`).click({ force: true });`,
                    `      cy.get(\`[data-cy="${fn}-add-toggle"] button\`).click({ force: true });`,
                    `      cy.get(\`[data-cy="${fn}-add-button"]\`).should('not.be.disabled');`,
                    `    });`,
                  ].join("\n"),
                );
              } else if (isMap && mapInner === "CassandraType.Name.BIGINT") {
                // MAP<TEXT, BIGINT> with UTC_DATETIME uses a nested <app-date-time>
                // for the value. We can verify the add-key + add-button hooks here;
                // the nested date-time has its own smoke test pattern (c.7) if used
                // elsewhere.
                widgetTestsForEntity.push(
                  [
                    `    it('should accept input on the ${fn} MAP<BIGINT/DATETIME> widget add row', () => {`,
                    `      cy.get(\`[data-cy="${fn}-add-key"]\`).type('sample-key');`,
                    `      cy.get(\`[data-cy="${fn}-add-key"]\`).should('have.value', 'sample-key');`,
                    `      cy.get(\`[data-cy="${fn}-add-button"]\`).should('exist');`,
                    `    });`,
                  ].join("\n"),
                );
              } else if (isMap) {
                // MAP<TEXT, TEXT> and MAP<TEXT, DECIMAL>
                const sampleValue =
                  mapInner === "CassandraType.Name.DECIMAL"
                    ? "1001"
                    : "sample-value";
                widgetTestsForEntity.push(
                  [
                    `    it('should accept input on the ${fn} MAP widget add row', () => {`,
                    `      cy.get(\`[data-cy="${fn}-add-key"]\`).type('sample-key');`,
                    `      cy.get(\`[data-cy="${fn}-add-key"]\`).should('have.value', 'sample-key');`,
                    `      cy.get(\`[data-cy="${fn}-add-value"]\`).type('${sampleValue}');`,
                    `      cy.get(\`[data-cy="${fn}-add-value"]\`).should('have.value', '${sampleValue}');`,
                    `      cy.get(\`[data-cy="${fn}-add-button"]\`).should('not.be.disabled');`,
                    `    });`,
                  ].join("\n"),
                );
              }
            }
            if (widgetTestsForEntity.length > 0) {
              const formFillStartForMap = `it('should create an instance of ${entity.entityAngularName}', () => {`;
              const blockStartForMap = content.indexOf(formFillStartForMap);
              const firstTestEndForMap = content.indexOf(
                "\n    });\n",
                blockStartForMap,
              );
              if (firstTestEndForMap !== -1) {
                const insertAt = firstTestEndForMap + "\n    });".length;
                content = `${content.slice(
                  0,
                  insertAt,
                )}\n\n${widgetTestsForEntity.join(
                  "\n\n",
                )}${content.slice(insertAt)}`;
              }
            }

            // (c.9) Round-trip test for MAP/SET widgets. Copies the scalar form
            // fills from `should create an instance of X` (so we reuse whatever
            // composite-key / required-field values that test sets), inserts
            // widget Add-row interactions before the Save click, then asserts
            // the POST response body includes the widget entries. This catches
            // bugs in the widget → form `(dataChange)` → DTO → backend → DTO →
            // JSON pipeline that smoke tests can't.
            //
            // MAP<DAYJS> (MAP<TEXT, BIGINT>) is now included — the nested
            // <app-date-time> in the Add row binds `[fieldName]="fieldName +
            // '-add-datetime'"`, so its date/hours/minutes/ampm sub-inputs are
            // addressable via data-cy. We type into each sub-input directly
            // (no Generate button is rendered inside the Add row).
            const roundTripWidgets = mapSetFields;
            if (roundTripWidgets.length > 0) {
              const createTestStart = `it('should create an instance of ${entity.entityAngularName}', () => {`;
              const createIdx = content.indexOf(createTestStart);
              const saveClickStr =
                "cy.get(entityCreateSaveButtonSelector).click();";
              const saveClickIdx = content.indexOf(saveClickStr, createIdx);
              if (createIdx !== -1 && saveClickIdx !== -1) {
                // Body = everything from after the opening `() => {` up to (but
                // not including) the Save-button line. This is the scalar form
                // fills we want to reuse verbatim.
                const bodyStart = createIdx + createTestStart.length;
                const scalarFills = content.slice(bodyStart, saveClickIdx);
                // Build per-widget Add-row interaction blocks and assertions.
                const widgetAddLines = (f) => {
                  const fn = f.fieldName;
                  const ann = f.options?.customAnnotation || [];
                  if (ann[0] === "CassandraType.Name.SET") {
                    return [
                      `      cy.get(\`[data-cy="${fn}-add-value"]\`).type('rt-${fn}-value');`,
                      `      cy.get(\`[data-cy="${fn}-add-button"]\`).click();`,
                    ].join("\n");
                  }
                  if (ann[1] === "CassandraType.Name.BOOLEAN") {
                    return [
                      `      cy.get(\`[data-cy="${fn}-add-key"]\`).type('rt-${fn}-key');`,
                      `      cy.get(\`[data-cy="${fn}-add-toggle"] button\`).click({ force: true });`,
                      `      cy.get(\`[data-cy="${fn}-add-toggle"] button\`).click({ force: true });`,
                      `      cy.get(\`[data-cy="${fn}-add-button"]\`).click();`,
                    ].join("\n");
                  }
                  if (ann[1] === "CassandraType.Name.BIGINT") {
                    // MAP<DAYJS> — type a key and click the nested <app-date-time>'s
                    // own Generate button (data-cy "<fn>-add-datetime-generate") so
                    // date / hours / minutes / amPm are populated atomically by the
                    // component, bypassing the mat-form-field actionability issues on
                    // the individual sub-inputs.
                    return [
                      `      cy.get(\`[data-cy="${fn}-add-key"]\`).type('rt-${fn}-key');`,
                      `      cy.get(\`[data-cy="${fn}-add-datetime-generate"]\`).click({ force: true });`,
                      `      cy.get(\`[data-cy="${fn}-add-button"]\`).click();`,
                    ].join("\n");
                  }
                  // MAP<TEXT> and MAP<DECIMAL>
                  const value =
                    ann[1] === "CassandraType.Name.DECIMAL"
                      ? "99.99"
                      : `rt-${fn}-value`;
                  return [
                    `      cy.get(\`[data-cy="${fn}-add-key"]\`).type('rt-${fn}-key');`,
                    `      cy.get(\`[data-cy="${fn}-add-value"]\`).type('${value}');`,
                    `      cy.get(\`[data-cy="${fn}-add-button"]\`).click();`,
                  ].join("\n");
                };
                const widgetAssertion = (f) => {
                  const fn = f.fieldName;
                  const ann = f.options?.customAnnotation || [];
                  if (ann[0] === "CassandraType.Name.SET") {
                    return `        expect(response.body.${fn}, 'SET round-trip: ${fn}').to.include('rt-${fn}-value');`;
                  }
                  if (ann[1] === "CassandraType.Name.BOOLEAN") {
                    // The (c.9) Add-row interaction clicks the slide-toggle TWICE
                    // (null → on → off) to commit a non-null value to the form; the
                    // committed value is `false`, not `true`. Assertion must match.
                    return `        expect(response.body.${fn}, 'MAP<BOOLEAN> round-trip: ${fn}').to.have.property('rt-${fn}-key', false);`;
                  }
                  if (ann[1] === "CassandraType.Name.DECIMAL") {
                    // backend may return string vs number depending on
                    // serialization; just check key exists.
                    return `        expect(response.body.${fn}, 'MAP<DECIMAL> round-trip: ${fn}').to.have.property('rt-${fn}-key');`;
                  }
                  if (ann[1] === "CassandraType.Name.BIGINT") {
                    // MAP<DAYJS>: backend serializes the dayjs value as ISO
                    // string or epoch ms; key presence is the round-trip signal.
                    return `        expect(response.body.${fn}, 'MAP<DAYJS> round-trip: ${fn}').to.have.property('rt-${fn}-key');`;
                  }
                  return `        expect(response.body.${fn}, 'MAP<TEXT> round-trip: ${fn}').to.have.property('rt-${fn}-key', 'rt-${fn}-value');`;
                };
                const interactions = roundTripWidgets
                  .map(widgetAddLines)
                  .join("\n\n");
                const assertions = roundTripWidgets
                  .map(widgetAssertion)
                  .join("\n");
                const roundTripTest =
                  `    it('should round-trip MAP/SET widget entries through POST', () => {${
                    scalarFills
                  }\n${interactions}\n\n` +
                  `      cy.get(entityCreateSaveButtonSelector).click();\n\n` +
                  `      cy.wait('@postEntityRequest').then(({ response }) => {\n` +
                  `        expect(response?.statusCode).to.equal(201);\n` +
                  `${assertions}\n` +
                  `        ${entity.entityInstance} = response.body;\n` +
                  `      });\n` +
                  `    });`;
                // Insert after the last existing test in the `new X page`
                // describe block. Anchor: the closing `\n    });\n` of the
                // create-instance test we just read from.
                const insertAt = saveClickIdx; // We'll find the actual insertion point next
                // Re-locate the create-instance test's closing `});` boundary.
                const closing = content.indexOf("\n    });\n", saveClickIdx);
                if (closing !== -1) {
                  const realInsertAt = closing + "\n    });".length;
                  content = `${content.slice(0, realInsertAt)}\n\n${
                    roundTripTest
                  }${content.slice(realInsertAt)}`;
                }
              }
            }

            // (c.10) Per-widget Edit-dialog tests. For each MAP/SET widget:
            // type into the Add row → click Add → click the new row's Edit
            // button (keyed by typed key or index) → assert dialog visible →
            // modify the dialog's value (or toggle) → click Save → assert
            // dialog dismissed. Validates the dialog open/save/close lifecycle
            // and the row-keyed data-cy hooks. MAP<DAYJS> is skipped because
            // its dialog wraps an <app-date-time> with no scalar value input.
            const editableWidgets = mapSetFields.filter((f) => {
              const ann = f.options?.customAnnotation || [];
              return !(
                ann[0] === "CassandraType.Name.MAP" &&
                ann[1] === "CassandraType.Name.BIGINT"
              );
            });
            const editTests = editableWidgets.map((f) => {
              const fn = f.fieldName;
              const ann = f.options?.customAnnotation || [];
              const safe = fn.replace(/[^a-zA-Z0-9]/g, "");
              const lines = [
                `    it('should edit a row in the ${fn} widget via dialog', () => {`,
              ];
              if (ann[0] === "CassandraType.Name.SET") {
                lines.push(
                  `      cy.get(\`[data-cy="${fn}-add-value"]\`).type('edit-orig');`,
                  `      cy.get(\`[data-cy="${fn}-add-button"]\`).click();`,
                  `      cy.get(\`[data-cy="${fn}-row-0-edit"]\`).click();`,
                  `      cy.get('mat-dialog-container').should('be.visible');`,
                  `      cy.get('[data-cy="dialog-edit-value"]').clear();`,
                  `      cy.get('[data-cy="dialog-edit-value"]').type('edit-new');`,
                  `      cy.get('[data-cy="dialog-save-button"]').click();`,
                  `      cy.get('mat-dialog-container').should('not.exist');`,
                );
              } else if (ann[1] === "CassandraType.Name.BOOLEAN") {
                lines.push(
                  `      cy.get(\`[data-cy="${fn}-add-key"]\`).type('edit-${safe}-key');`,
                  `      cy.get(\`[data-cy="${fn}-add-toggle"] button\`).click({ force: true });`,
                  `      cy.get(\`[data-cy="${fn}-add-toggle"] button\`).click({ force: true });`,
                  `      cy.get(\`[data-cy="${fn}-add-button"]\`).click();`,
                  `      cy.get(\`[data-cy="${fn}-row-0-edit"]\`).click();`,
                  `      cy.get('mat-dialog-container').should('be.visible');`,
                  `      cy.get('[data-cy="dialog-edit-toggle"] button').click({ force: true });`,
                  `      cy.get('[data-cy="dialog-save-button"]').click();`,
                  `      cy.get('mat-dialog-container').should('not.exist');`,
                );
              } else {
                // MAP<TEXT> / MAP<DECIMAL>
                const editKey = `edit-${safe}-key`;
                const orig =
                  ann[1] === "CassandraType.Name.DECIMAL"
                    ? "77.77"
                    : "edit-orig";
                const nw =
                  ann[1] === "CassandraType.Name.DECIMAL"
                    ? "88.88"
                    : "edit-new";
                lines.push(
                  `      cy.get(\`[data-cy="${fn}-add-key"]\`).type('${editKey}');`,
                  `      cy.get(\`[data-cy="${fn}-add-value"]\`).type('${orig}');`,
                  `      cy.get(\`[data-cy="${fn}-add-button"]\`).click();`,
                  `      cy.get(\`[data-cy="${fn}-row-${editKey}-edit"]\`).click();`,
                  `      cy.get('mat-dialog-container').should('be.visible');`,
                  `      cy.get('[data-cy="dialog-edit-value"]').clear();`,
                  `      cy.get('[data-cy="dialog-edit-value"]').type('${nw}');`,
                  `      cy.get('[data-cy="dialog-save-button"]').click();`,
                  `      cy.get('mat-dialog-container').should('not.exist');`,
                );
              }
              lines.push(`    });`);
              return lines.join("\n");
            });

            // (c.11) Per-widget Delete-row tests. Same shape as (c.10) but
            // clicks the row's Delete button and asserts the row's hook no
            // longer exists. Index-based for SET/MAP<BOOLEAN>, key-based for
            // MAP<TEXT>/MAP<DECIMAL>. MAP<DAYJS> uses key-based row hooks
            // (entry.key) so it can be tested even though edit can't.
            const deleteTests = mapSetFields.map((f) => {
              const fn = f.fieldName;
              const ann = f.options?.customAnnotation || [];
              const safe = fn.replace(/[^a-zA-Z0-9]/g, "");
              const lines = [
                `    it('should delete a row in the ${fn} widget', () => {`,
              ];
              if (ann[0] === "CassandraType.Name.SET") {
                lines.push(
                  `      cy.get(\`[data-cy="${fn}-add-value"]\`).type('delete-target');`,
                  `      cy.get(\`[data-cy="${fn}-add-button"]\`).click();`,
                  `      cy.get(\`[data-cy="${fn}-row-0-edit"]\`).should('exist');`,
                  `      cy.get(\`[data-cy="${fn}-row-0-delete"]\`).click();`,
                  `      cy.get(\`[data-cy="${fn}-row-0-edit"]\`).should('not.exist');`,
                );
              } else if (ann[1] === "CassandraType.Name.BOOLEAN") {
                lines.push(
                  `      cy.get(\`[data-cy="${fn}-add-key"]\`).type('del-${safe}-key');`,
                  `      cy.get(\`[data-cy="${fn}-add-toggle"] button\`).click({ force: true });`,
                  `      cy.get(\`[data-cy="${fn}-add-toggle"] button\`).click({ force: true });`,
                  `      cy.get(\`[data-cy="${fn}-add-button"]\`).click();`,
                  `      cy.get(\`[data-cy="${fn}-row-0-edit"]\`).should('exist');`,
                  `      cy.get(\`[data-cy="${fn}-row-0-delete"]\`).click();`,
                  `      cy.get(\`[data-cy="${fn}-row-0-edit"]\`).should('not.exist');`,
                );
              } else if (ann[1] === "CassandraType.Name.BIGINT") {
                // MAP<DAYJS> — type the key, click the nested <app-date-time>'s
                // own Generate button to fill the datetime atomically, then add
                // the row and verify the delete cycle.
                const delKey = `del-${safe}-key`;
                lines.push(
                  `      cy.get(\`[data-cy="${fn}-add-key"]\`).type('${delKey}');`,
                  `      cy.get(\`[data-cy="${fn}-add-datetime-generate"]\`).click({ force: true });`,
                  `      cy.get(\`[data-cy="${fn}-add-button"]\`).click();`,
                  `      cy.get(\`[data-cy="${fn}-row-${delKey}-edit"]\`).should('exist');`,
                  `      cy.get(\`[data-cy="${fn}-row-${delKey}-delete"]\`).click();`,
                  `      cy.get(\`[data-cy="${fn}-row-${delKey}-edit"]\`).should('not.exist');`,
                );
              } else {
                const delKey = `del-${safe}-key`;
                const val =
                  ann[1] === "CassandraType.Name.DECIMAL"
                    ? "66.66"
                    : "delete-val";
                lines.push(
                  `      cy.get(\`[data-cy="${fn}-add-key"]\`).type('${delKey}');`,
                  `      cy.get(\`[data-cy="${fn}-add-value"]\`).type('${val}');`,
                  `      cy.get(\`[data-cy="${fn}-add-button"]\`).click();`,
                  `      cy.get(\`[data-cy="${fn}-row-${delKey}-edit"]\`).should('exist');`,
                  `      cy.get(\`[data-cy="${fn}-row-${delKey}-delete"]\`).click();`,
                  `      cy.get(\`[data-cy="${fn}-row-${delKey}-edit"]\`).should('not.exist');`,
                );
              }
              lines.push(`    });`);
              return lines.join("\n");
            });

            const editDeleteTests = [...editTests, ...deleteTests];
            if (editDeleteTests.length > 0) {
              // Append AFTER all other tests in `new X page` describe block.
              // Anchor: the closing `});` of the round-trip test if present,
              // else of the create-instance test. We re-scan from the end so
              // we land after whatever (c.9) just inserted.
              const createAnchor = `it('should create an instance of ${entity.entityAngularName}', () => {`;
              const createIdx2 = content.indexOf(createAnchor);
              if (createIdx2 !== -1) {
                // Find the LAST `});` in the new-page describe by scanning
                // forward from create and stepping through each test boundary.
                let cursor = createIdx2;
                let lastEnd = -1;
                while (true) {
                  const next = content.indexOf("\n    });\n", cursor);
                  if (next === -1) break;
                  lastEnd = next + "\n    });".length;
                  cursor = next + 1;
                  // Stop when the next test opener moves into a different scope
                  const nextIt = content.indexOf("\n    it(", cursor);
                  const nextDescribe = content.indexOf("\n  describe(", cursor);
                  if (
                    nextIt === -1 ||
                    (nextDescribe !== -1 && nextDescribe < nextIt)
                  )
                    break;
                }
                if (lastEnd !== -1) {
                  content = `${content.slice(
                    0,
                    lastEnd,
                  )}\n\n${editDeleteTests.join(
                    "\n\n",
                  )}${content.slice(lastEnd)}`;
                }
              }
            }

            // (d) Widen the `entitiesRequest` / `entitiesRequestInternal` intercept URL.
            // Upstream emits `'/services/<svc>/api/<entity>+(?*|)'` (matches the base path
            // optionally followed by `?...`). The cassandra pagination overhaul moved the
            // list GET to `/api/<entity>/slice?size=20` — the `/slice` path segment
            // breaks the upstream glob (and also `**` when attached to a non-`/` segment
            // like `<entity>**`, since minimatch's `**` only crosses path separators when
            // it's a standalone segment). Convert the string glob to a regex literal
            // anchored with `\b` (word boundary) so it matches `/<entity>`, `/<entity>?...`,
            // `/<entity>/slice`, and `/<entity>/slice?...` uniformly. Forward slashes are
            // escaped because they're the regex delimiter in the emitted source.
            content = content.replace(
              /'((?:\/services\/)?[^']*)(?:\+\(\?\*\|\)|\*\*)'/g,
              (_, urlPath) => {
                const escaped = urlPath.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
                return `/^${escaped}\\b/`;
              },
            );

            return content;
          });
        }

        // ---------------------------------------------------------------------------
        // Composite-key entities render a partition/clustering-key search form (the
        // blueprint's headline list feature). Append an e2e smoke test that opens the
        // form and confirms the Search button surfaces. The form's data-cy hooks
        // (searchFormToggle / searchButton) are emitted by the cassandra-angular list
        // template. Only runs for apps that enable Cypress (testFrameworks cypress).
        // ---------------------------------------------------------------------------
        for (const entity of entities) {
          if (entity.builtIn || !entity.entityFileName) continue;
          if (!entity.primaryKeySaathratri?.composite) continue;

          const specPath = `${cypressDir}e2e/entity/${entity.entityFileName}.cy.ts`;
          if (!this.existsDestination(specPath)) continue;

          this.editFile(specPath, (content) => {
            if (
              typeof content !== "string" ||
              content.includes("should toggle the Cassandra search form")
            )
              return content;
            // Drive the navbar entity dropdown (clickOnEntityMenuItem opens the
            // <baseName>Menu dropdown, then clicks the entity link). Pass the spec's own
            // *PageUrl minus its leading slash so the href matches the gateway's actual
            // route — mf-prefixed (/<baseName>/<entity>) on a microfrontend, plain
            // (/<entity>) on a monolith. Then open the search form and assert the Search
            // button surfaces.
            const searchTest = `
  it('should toggle the Cassandra search form', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem(${entity.entityInstance}PageUrl.substring(1));
    cy.get('[data-cy="searchFormToggle"]', { timeout: 30000 }).click();
    cy.get('[data-cy="searchButton"]').should('be.visible');
  });
`;
            const idx = content.lastIndexOf("});");
            if (idx === -1) return content;
            return content.slice(0, idx) + searchTest + content.slice(idx);
          });
          this.log.info(
            `[cypress] Added Cassandra search-form e2e smoke test to ${specPath}`,
          );
        }

        // ---------------------------------------------------------------------------
        // UUID / TIMEUUID key fields render a "Generate" + "Reset" button next to the
        // input (data-cy "<field>-generate" / "<field>-reset", emitted by the
        // cassandra-angular update template). Append an e2e test that drives them:
        // Generate fills a valid UUID, Reset clears it back. Only runs when Cypress is
        // enabled. Picks the first such key field per entity.
        // ---------------------------------------------------------------------------
        for (const entity of entities) {
          if (entity.builtIn || !entity.entityFileName) continue;
          const uuidField = (entity.fields ?? []).find(
            (f) => f.fieldTypeUuidSaathratri || f.fieldTypeTimeUuidSaathratri,
          );
          if (!uuidField) continue;

          const specPath = `${cypressDir}e2e/entity/${entity.entityFileName}.cy.ts`;
          if (!this.existsDestination(specPath)) continue;

          this.editFile(specPath, (content) => {
            if (
              typeof content !== "string" ||
              content.includes("should generate and reset a UUID")
            )
              return content;
            const fn = uuidField.fieldName;
            const uuidTest = `
  it('should generate and reset a UUID via the form buttons', () => {
    cy.visit('/');
    cy.clickOnEntityMenuItem(${entity.entityInstance}PageUrl.substring(1));
    cy.get(entityCreateButtonSelector, { timeout: 30000 }).click();
    // Generate fills a fresh UUID via the component's generateUUID()/generateTimeUUID().
    cy.get(\`[data-cy="${fn}-generate"]\`).click();
    cy.get(\`[data-cy="${fn}"]\`)
      .invoke('val')
      .should('match', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    // Reset restores the (empty) saved value, clearing the field.
    cy.get(\`[data-cy="${fn}-reset"]\`).click();
    cy.get(\`[data-cy="${fn}"]\`).should('have.value', '');
  });
`;
            const idx = content.lastIndexOf("});");
            if (idx === -1) return content;
            return content.slice(0, idx) + uuidTest + content.slice(idx);
          });
          this.log.info(
            `[cypress] Added UUID generate/reset e2e test to ${specPath}`,
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
