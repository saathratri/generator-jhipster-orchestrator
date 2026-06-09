# Testing & Debugging Guide — generator-jhipster-orchestrator

How to test and debug this blueprint. Unlike the two upstream blueprints it composes, the
orchestrator is an **assembled** blueprint: on every regen `saathratri-generator-code-prepare`
copies the `sql-*` generators from `generator-jhipster-ai-postgresql` and the `cassandra-*`
generators from `generator-jhipster-cassandra` into `generators/`, then string-renames their
namespaces to `jhipster-orchestrator`. So the orchestrator's own test surface has **two halves**:

1. **Inherited snapshot specs** for the copied `sql-*` / `cassandra-*` (and core-override)
   sub-generators — each is run through the blueprint and its `getStateSnapshot()` file-write state
   is asserted. These come from the base repos and are kept honest there.
2. **Behavioral content specs** for the orchestrator's **own** sub-generators (`heroku-orchestrator`,
   `spring-boot-orchestrator`, `maven-orchestrator`, `liquibase-orchestrator`, `docker-orchestrator`,
   `server`) — these assert the **actual generated content** of every Saathratri customization
   (Heroku profile, CORS/logback patches, DTO module, pgvector changelogs, Keycloak realm, db
   dispatch), because a state-only snapshot would pass even if every one of those edits silently
   broke. See §2.4.

The **generated application's** backend/frontend tests are the same SQL and Cassandra output the
upstream blueprints produce, and are debugged with their guides.

> **Companion docs (read these for generated-app failures):**
> `generator-jhipster-cassandra/TESTING.md` (composite-key backend + Angular bug catalogues — the
> deep one) and `generator-jhipster-ai-postgresql/TESTING.md` (SQL/pgvector parallel). The
> orchestrator emits their templates verbatim, so any generated-app bug is fixed **there**, not here.

---

## 0. The one rule: **fix templates / base repos, never generated code**

The generated app is disposable — every regen overwrites it. Two corollaries specific to this
assembled blueprint (see also the repo `CLAUDE.md` → "Regeneration & Generator Architecture"):

- The orchestrator's **`sql-*` / `cassandra-*` dirs are overwritten every regen** by the prepare
  copy. Never edit them here — fix the corresponding template in the **base repo**
  (`generator-jhipster-ai-postgresql` or `generator-jhipster-cassandra`), which also keeps the
  upstream snapshot suites honest.
- The orchestrator's **other** sub-generators (`server`, `client`, `docker`, `java`, `spring-boot`,
  `heroku-orchestrator`, `liquibase`, `maven`, and their `*-orchestrator` variants) are
  hand-maintained here — edit them directly, then refresh this suite's snapshots.

---

## 1. Environment (once)

Behind a TLS-intercepting corporate proxy, point the toolchains at the OS trust store (Node 22+):

```bash
export NODE_OPTIONS=--use-system-ca                              # npm / vitest / eslint
export MAVEN_OPTS="-Djavax.net.ssl.trustStoreType=Windows-ROOT"  # Windows; macOS: KeychainStore
```

The Layer 1 suite below is pure Node (no Docker, no Java). Docker/Java are only needed for the
generated-app layers, which you run from the real generated services — see §4.

---

## 2. Layer 1 — the generator's own unit tests (the suite this repo owns)

Run **in the generator repo** (`orchestrator/saathratri/generator-jhipster-orchestrator`):

```bash
npx vitest run            # full suite
```

Expected: **Test Files 21 passed (21) / Tests 52 passed (52)**.

Most `generators/*/generator.spec.js` run their sub-generator through the blueprint and assert
`result.getStateSnapshot()` against `__snapshots__/generator.spec.js.snap`. After an *intended*
change to which files a sub-generator writes:

```bash
npm run update-snapshot   # = vitest run --update
```

…then **inspect the diff** (`git diff generators/*/__snapshots__/`) to confirm it's only your change.

### 2.1 ⚠️ Use `npx vitest run`, not `npm test`

`npm test` runs a `pretest` = `prettier-check && eslint .` gate first. That gate is **pre-existing
red** across this repo's `.js`/`.md`/`.ts`, so `npm test` aborts in `pretest` and Vitest never runs.
Call Vitest directly to exercise the snapshot suite. (The bundled `.github/workflows/generator.yml`
runs `npm run test` on Node 20, but it lives in this **subdir**, not the git repo root `.github/`, so
GitHub Actions does not pick it up — the workflow is dormant. Fixing the prettier/eslint gate and
moving/duplicating the workflow to the repo root would make CI live.)

### 2.2 How the harness is wired (what made the suite go green)

The suite was scaffolded but fully red until these were repaired (commit `ea31d2ac7`):

- **`vitest.config.ts`** must declare `setupFiles: ['./vitest.test-setup.ts']` — without it the
  setup never loads and `withConfiguredBlueprint()` cannot resolve.
- **`vitest.test-setup.ts`** must register the blueprint so the test runner can find it:
  ```ts
  defineDefaults({
    mockFactory: () => vi.fn(),
    blueprint: 'generator-jhipster-orchestrator',
    blueprintPackagePath: fileURLToPath(new URL('./', import.meta.url)),
  });
  ```
  Missing the `blueprintPackagePath` throws *"Blueprint generators package path must be configured"*.
- **Spec run chain** is the current API:
  ```js
  await helpers.run(BLUEPRINT_NAMESPACE)
    .withJHipsterConfig()
    .withOptions({ ignoreNeedlesError: true })
    .withJHipsterGenerators()
    .withConfiguredBlueprint()
    .withBlueprintConfig();
  ```
  The dead `.withJHipsterLookup()` / `.withParentBlueprintLookup()` chain (and the inline
  `blueprint: 'orchestrator'` option) no longer exist.

### 2.3 ⚠️ Namespace rule (the thing that's easy to get wrong)

`BLUEPRINT_NAMESPACE` in each spec depends on whether the sub-generator has a custom name or
overrides a JHipster core generator:

| Sub-generator kind | `BLUEPRINT_NAMESPACE` | Examples |
|---|---|---|
| Custom-named | `jhipster-orchestrator:<name>` | `heroku-orchestrator`, `sql-spring-boot`, `cassandra-angular`, `data-relational`, `data-cassandra` |
| Core-name override | `jhipster:<name>` | `server`, `client`, `angular`, `docker`, `java`, `spring-boot` |

A wrong prefix (e.g. the old `heroku-saathratri` typo) makes the runner fail to resolve the
generator. The copied `sql-*` / `cassandra-*` specs arrive from the base repos carrying their
**source** prefix (`jhipster-ai-postgresql:` / `jhipster-cassandra:`); the prepare script rewrites
them — see §3.

**Behavioral specs use an integration entry point, not the leaf namespace.** Most of the
orchestrator's customizations are `POST_WRITING` `editFile()` patches against files the *base*
Spring Boot generator writes (`pom.xml`, `SecurityConfiguration.java`, `logback-spring.xml`,
`application-dev.yml`). Running a leaf generator alone produces none of those, so the edit has
nothing to patch. The §2.4 specs therefore run the **whole server stack** and assert the result:

| Generator under test | Entry namespace | Why |
|---|---|---|
| `heroku-orchestrator`, `spring-boot-orchestrator`, `docker-orchestrator`, `server` | `jhipster:server` (+ `applicationType` micro/gateway, `authenticationType: oauth2`) | server composes these and the base files their `editFile`s patch exist |
| `liquibase-orchestrator` | `jhipster:liquibase` (+ entities) | lighter; produces `master.xml` + vector/index entity changelogs |
| `maven-orchestrator` | `jhipster-orchestrator:maven-orchestrator` (leaf) | a no-op stub — server/app don't compose the maven router (see §2.4); the heap config it owned moved to `spring-boot-orchestrator` |

`authenticationType: oauth2` is required for the `docker-orchestrator` realm spec — the base docker
generator only computes `keycloakSecrets` (which the realm template references) under oauth2.

---

## 2.4 Orchestrator-specific behavioral coverage

These are the customizations the orchestrator adds **on top of** the base blueprints — none of them
are covered by the inherited `sql-*` / `cassandra-*` snapshot specs (those test the base templates;
the orchestrator's edits run *after*, in preserved `*-orchestrator` submodules). Each spec asserts
the generated **content**, so it fails loudly if a Saathratri customization regresses.

| Sub-generator | What the spec asserts (content, not just file presence) |
|---|---|
| `heroku-orchestrator` | `Procfile`/`system.properties`/`.slugignore`/`application-heroku.yml`/`bootstrap-heroku.yml` written for micro+gateway; `Procfile` activates `prod,heroku`; the additive `heroku` Maven profile (`<profile.heroku/>`, `<id>heroku</id>`, `<profile.heroku>,heroku</profile.heroku>`) is injected into `pom.xml` and `${profile.heroku}` is appended to the prod `spring.profiles.active`. Negative: a **monolith** gets none of it. |
| `spring-boot-orchestrator` | dev CORS block (with the `localhost:4200` origins) patched into `application-dev.yml`; `.cors(withDefaults())` patched into `SecurityConfiguration.java`; the `SAATHRATRI CHANGE: dev file logging` FILE+ASYNC appenders patched into `logback-spring.xml`; the sibling `…dto/` Maven module scaffolded (`.gitignore` + pom); **`.mvn/jvm.config` written with the 8 GB Maven heap (`-Xmx8g …`) for SQL services** (gateway + SQL microservices), not for Cassandra. Cassandra services get the `aws-java-sdk-s3` dependency (Astra secure bundle); SQL services do **not**. Gateway does **not** get the microservice-only dev CORS patch. |
| `liquibase-orchestrator` | SQL `master.xml` written; a pgvector field (`@customAnnotation("VECTOR") @customAnnotation("1536")`) generates an `added_vector_<Entity>.xml` changelog containing `vector(1536)`; `@customQueryAnnotation("… params[ … ] index")` generates an `added_custom_query_indexes_<Entity>.xml` with a `<createIndex>` per directive (single + composite columns), and `eager[ rel ]` on a many-to-one indexes the FK column (`idx_<table>_<fk>_id`); all are needled into `master.xml`. Negatives: a plain entity adds no vector/index changelog. |
| `docker-orchestrator` | Keycloak `realm-config/jhipster-realm.json` carries the orchestrator service-account client (`orchestrator-client-id` / `orchestrator-client-secret`) for service-to-service OAuth2. Negative: a monolith realm has no such client. |
| `server` | dispatch routing — SQL config pulls in `sql-spring-boot` (not cassandra) and composes `heroku-orchestrator`; Cassandra config pulls in `cassandra-spring-boot` (not SQL). Keeps the original monolith `getStateSnapshot()` snapshot. |
| `maven-orchestrator` | composes/loads cleanly (emits its WRITING stub) and asserts it does **not** itself write `.mvn/jvm.config` — see the note below. |

### `maven-orchestrator` is a no-op; the jvm.config lives in `spring-boot-orchestrator`

`maven-orchestrator` overrides `jhipster:maven`, but JHipster 8 runs `java-simple-application:maven`
instead. So the orchestrator's `maven` router (and `maven-orchestrator`) **never execute** in real
generation — generated services contain no `template-file-maven-orchestrator` stub (compare: the
`spring-boot-orchestrator`, `liquibase-orchestrator`, `docker-orchestrator`, `heroku-orchestrator`
stubs *are* present). That is why the 8 GB `.mvn/jvm.config` heap override used to ship empty.

**Fix:** the heap config now lives in `spring-boot-orchestrator` POST_WRITING
(`writeJvmConfigForSql`), which provably runs for the gateway and SQL microservices and already
patches `pom.xml` there. It writes literal content via `writeDestination`, in POST_WRITING, so it
deterministically overwrites the empty `.mvn/jvm.config` the base `java/maven` generator emits in
WRITING. The spring-boot-orchestrator spec asserts `-Xmx8g` lands for SQL micro + gateway and is
absent for Cassandra — and because that spec runs at the same `jhipster:server` entry that produces
the real generated tree, it validates the fix end-to-end (not just as a pinned expectation).

---

## 3. Keeping the suite green across regen

`saathratri-generator-code-prepare.{sh,bat}` copies each upstream `sql-*` / `cassandra-*` spec in
verbatim, so its `BLUEPRINT_NAMESPACE` still says `jhipster-ai-postgresql:` / `jhipster-cassandra:`.
A rename pass runs on every regen to rewrite those to `jhipster-orchestrator:` (scoped to the right
subtree so it never touches the wrong specs):

```bash
# from the prepare script — generic over generator.spec.js inside each subtree:
... saathratri-generator-code-replace.sh "<generators>" "generator.spec.js" "jhipster-cassandra"     "jhipster-orchestrator" "cassandra-*"
... saathratri-generator-code-replace.sh "<generators>" "generator.spec.js" "jhipster-ai-postgresql"  "jhipster-orchestrator" "sql-*"
```

This is why the suite survives regeneration instead of depending on hand-fixed copies. If a regen
ever leaves a `sql-*`/`cassandra-*` spec red, first confirm the rename pass ran (grep the copied
spec for its `BLUEPRINT_NAMESPACE`); a stale upstream prefix is the usual cause. A snapshot diff
after regen is expected when the upstream template changed (e.g. the `entity-navbar-items.ts` needle
fix carried into the orchestrator copy) — review it, then `npm run update-snapshot`.

---

## 4. Layers 2 & 3 — generated backend & frontend

The orchestrator's bundled `.blueprint/generate-sample/templates/samples/sample.jdl` is the default
JHipster **Blog/Post/Tag monolith** scaffold — it does **not** represent how this blueprint is used.
The real exercise is the example workspace's `saathratri-apps-orchestrator-mf.jdl` generated via the
master script from the project root:

```bash
sh saathratri-generate-code-dev-main.sh       # macOS/Linux
.\saathratri-generate-code-dev-main.bat       # Windows (PowerShell — leading `.\` required)
```

The generated SQL services (gateway, organizations, maintenance) and Cassandra services (cassandrablog,
cassandrastore) are the **same output** the two base blueprints produce. So their backend
(Testcontainers ITs) and frontend (ESLint + Vitest) layers, and every bug pattern, are documented
in the companion guides — use them directly:

- **Cassandra** services → `generator-jhipster-cassandra/TESTING.md` §4–6 (composite-key REST CRUD,
  nested-`compositeId` Angular model, `Set`/`Map`/date-time components).
- **SQL / pgvector** services → `generator-jhipster-ai-postgresql/TESTING.md` §4–5 (human-readable
  FKs, vector column, the `entity-navbar-items.ts` write).

Fix any generated-app bug in the **base repo's** template, re-run that base repo's `npx vitest run`,
re-assemble (`saathratri-generator-code-prepare`), and refresh this suite's snapshots if the change
altered which files the `sql-*`/`cassandra-*` sub-generators write.

### 4.1 Cypress widget testing flows from the base repos

The two base blueprints both ship a `generators/cypress/generator.js` that post-processes the upstream
JHipster Cypress suite in `POST_WRITING_ENTITIES`. Since the orchestrator copies `sql-*` /
`cassandra-*` from those repos on every regen, the cypress passes flow in automatically. **Do not edit
the orchestrator's copies** — they're overwritten next regen.

- **Cassandra blueprint** owns the widget templates (SET, MAP<TEXT/DECIMAL/BOOLEAN/DAYJS>, `<app-date-time>`)
  and their `data-cy` hooks (Add-row, per-row, dialog). Its cypress generator emits per-widget smoke,
  round-trip, edit-dialog, and delete-row tests. Pass catalogue (a → c.11 → d) is in
  `generator-jhipster-cassandra/TESTING.md` §5.2.
- **ai-postgresql blueprint** owns the navbar selector rewrite, async timeout bumps, and required-FK
  label assertion. Pass catalogue is in `generator-jhipster-ai-postgresql/TESTING.md` §5.2.

If a generated-app cypress spec needs a new patch, decide first whether it's a Cassandra-specific
(widgets, composite keys, UTC_DATETIME) or SQL-specific (FK labels, microfrontend navbar) concern, then
edit the matching base repo's cypress generator and re-run `saathratri-generate-code-dev-main.sh`.

---

## 5. Quick reference

```bash
# ----- in the generator repo (this dir) -----
NODE_OPTIONS=--use-system-ca npx vitest run        # the suite — 21 files / 52 tests (NOT `npm test`; pretest gate is red)
NODE_OPTIONS=--use-system-ca npx vitest run generators/spring-boot-orchestrator   # one behavioral spec while iterating
npm run update-snapshot                            # vitest run --update, after intended write changes
npx vitest                                         # watch mode while iterating on one sub-generator

# ----- re-assemble the blueprint (refreshes sql-*/cassandra-* + renames spec namespaces) -----
# run from the project root, as part of the master regen:
sh saathratri-generate-code-dev-main.sh

# ----- generated-app layers: see the companion guides -----
#   generator-jhipster-cassandra/TESTING.md     (Cassandra services)
#   generator-jhipster-ai-postgresql/TESTING.md (SQL/pgvector services)
```
