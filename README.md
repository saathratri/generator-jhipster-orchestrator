# generator-jhipster-orchestrator

> Generate a microservices platform with both PostgreSQL and Cassandra services **from one JDL file**. The master JHipster blueprint for the Saathratri microservices platform orchestrates two specialized blueprints — [`generator-jhipster-ai-postgresql`](https://github.com/saathratri/generator-jhipster-ai-postgresql) (SQL / pgvector) and [`generator-jhipster-cassandra`](https://github.com/saathratri/generator-jhipster-cassandra) (Cassandra) — into a single pipeline that generates a full multi-database microservices stack with DTO modularization and Heroku deployment. Compatible with JHipster v9.2.0.

Built and maintained by [Saathratri, LLC](https://www.saathratri.com), whose hospitality platform microservices are generated with this blueprint.

## Introduction

This is a [JHipster](https://www.jhipster.tech/) blueprint, designed to generate an entire **microservices platform** that mixes **PostgreSQL (with pgvector)** and **Apache Cassandra** services side by side in the same monorepo — all **from one JDL file**. If you have ever asked "how can I generate a microservices platform with both PostgreSQL and Cassandra services from one JDL?", this blueprint is the answer: declare every application and entity in a single JDL, run one generation, and each microservice comes out with its database's idiomatic persistence, migrations, pagination, and vector search.

Rather than reimplementing entity generation, the `generator-jhipster-orchestrator` blueprint **composes** the two upstream Saathratri blueprints and adds the cross-cutting concerns a real microservices deployment needs: a separate Maven DTO JAR per service, Heroku deployment artifacts, Angular Material theming for Cassandra date/time widgets, dual-gateway CORS deduplication, and a single JDL → multi-app generation flow.

It is a **Side-by-Side (SBS) blueprint** (`sbsBlueprint: true`): it complements JHipster's core generators rather than replacing them, and it routes each generation phase to the correct database-specific implementation based on each microservice's `databaseType`.

---

## 🔑 Key Features

- **Multi-Database Microservices in One Monorepo**
  - PostgreSQL (with `pgvector` for AI search) and Apache Cassandra services generated from a single JDL.
  - Each service routes to the correct backend, frontend, Docker, and Liquibase generators automatically based on its `databaseType`.

- **DTO Modularization**
  - Automatically emits a **separate Maven DTO JAR project** (`${baseName}dto/`) for every microservice.
  - Lets the orchestrator service (and any other consumer) depend on a service's DTOs without pulling in the whole microservice.
  - Handles Cassandra composite-key `DTOId` classes alongside the regular DTOs.

- **Composed Upstream Capabilities**
  - **AI semantic vector search** and **human-readable foreign keys** flow in from `generator-jhipster-ai-postgresql`.
  - **Cassandra composite primary keys**, `SET`/`MAP` collection widgets, and UTC date handling flow in from `generator-jhipster-cassandra`.

- **Deployment & Platform Concerns**
  - **Heroku**: generates `Procfile`, `system.properties`, `bootstrap-heroku.yml`, and a `heroku` Maven profile.
  - **Angular Material**: injects `@angular/material` / `@angular/cdk` and the Material theme for Cassandra date/time widgets.
  - **CORS deduplication**: resolves dual-gateway CORS header conflicts via a `DedupeResponseHeader` patch.
  - **Astra DB ready**: production templates wire a `CqlSession` bean, AWS S3 SDK, and env-var credentials for Cassandra services.

- **Patching Philosophy**
  - Overrides only the templates that need Saathratri-specific changes, letting JHipster's base templates handle everything else.
  - Every customization is marked with a `SAATHRATRI CHANGE:` comment so it is easy to audit and rebase onto new JHipster versions.

---

## 🏗️ Architecture Overview

The orchestrator composes multiple specialized blueprints into a single generation pipeline. It does **not** replace JHipster's base generators — it enhances them.

```
jhipster --blueprints orchestrator jdl saathratri-apps-orchestrator-mf.jdl
                    |
                    v
    generator-jhipster-orchestrator (this blueprint)
        |
        +-- Own sub-generators
        |       server, client, docker, spring-boot, java, liquibase, maven, angular,
        |       spring-boot-orchestrator, liquibase-orchestrator, maven-orchestrator,
        |       docker-orchestrator, heroku-orchestrator
        |
        +-- SQL sub-generators (copied from generator-jhipster-ai-postgresql)
        |       +-- sql-spring-boot   (backend: Resource, Service, ServiceImpl, DTO, Mapper)
        |       +-- sql-angular       (frontend: entity CRUD pages + AI search)
        |       +-- sql-docker        (Docker Compose: PostgreSQL with pgvector)
        |
        +-- Cassandra sub-generators (copied from generator-jhipster-cassandra)
                +-- cassandra-spring-boot   (backend: Resource, Service, ServiceImpl, DTO/DTOId, Mapper)
                +-- cassandra-angular       (frontend: entity CRUD pages + UTC date handling)
                +-- cassandra-docker        (Docker Compose: Cassandra)
                +-- cassandra-java          (domain entities with composite keys)
                +-- cassandra-client        (i18n support)
```

The `sql-*` and `cassandra-*` sub-generators are **not stored in this repo** — they are copied in fresh from the two base blueprints on every regeneration (see [Code Generation Workflow](#-code-generation-workflow)). **Fix template bugs in the base repos, never in this repo's copies.**

### Composition Flow

JHipster invokes the orchestrator's sub-generators via the SBS pattern; each routes to the correct database-specific generator during the `COMPOSING` phase:

```
JHipster base:server      → orchestrator:server      → [SQL] sql-spring-boot / [Cassandra] cassandra-spring-boot  (+ heroku-orchestrator)
JHipster base:client      → orchestrator:client      → [SQL] sql-angular     / [Cassandra] cassandra-angular
JHipster base:spring-boot → orchestrator:spring-boot → [SQL] sql-spring-boot / [Cassandra] cassandra-spring-boot
JHipster base:java:domain → orchestrator:java:domain → [Cassandra] cassandra-java:domain
JHipster base:docker      → orchestrator:docker      → [SQL] sql-docker      / [Cassandra] cassandra-docker
JHipster base:liquibase   → orchestrator:liquibase   → [SQL] liquibase-orchestrator
```

---

## 🚀 Quick Start

### Prerequisites

As this is a [JHipster](https://www.jhipster.tech/) blueprint, JHipster and its related tools must already be installed — see [Installing JHipster](https://www.jhipster.tech/installation/).

- **Node.js** ^18.13.0 or >= 20.6.1
- **JHipster** 9.2.0 — `npm install -g generator-jhipster@9.2.0`
- **generator-jhipster-ai-postgresql** — `npm install -g generator-jhipster-ai-postgresql`
- **generator-jhipster-cassandra** — `npm install -g generator-jhipster-cassandra`
- **Java 21+** and **Docker Desktop** (to build/run the generated apps)

> The two upstream blueprints are required because the orchestrator copies their `sql-*` and `cassandra-*` sub-generators in during its prepare phase.

### Installation

For development (recommended — allows live editing):

```bash
cd generator-jhipster-orchestrator
npm install
npm link
```

Or install the published package:

```bash
npm install -g generator-jhipster-orchestrator
```

### Usage

```bash
jhipster --blueprints orchestrator jdl saathratri-apps-orchestrator-mf.jdl
```

Look for orchestrator-specific options with:

```bash
jhipster app --blueprints orchestrator --help
```

### AI Semantic Search (Optional)

Services with vector fields (`@customAnnotation("VECTOR")`) generate AI-powered semantic search. To enable it, provide an OpenAI API key before running the service:

```bash
export OPENAI_API_KEY=sk-your-key-here
```

Or add it to the microservice's `application-dev.yml`:

```yaml
openai:
  api-key: sk-your-key-here
```

Without the key, the app runs normally — embedding generation and AI search are simply disabled.

---

## 🧩 Code Generation Workflow

The full Saathratri codebase is generated by running, from the `saathratri-main/` (production) or `jhipster-orchestrator/` (example) workspace:

```bash
sh saathratri-generate-code-dev-orchestrator.sh       # macOS/Linux
.\saathratri-generate-code-dev-orchestrator.bat       # Windows (PowerShell — leading `.\` required)
```

This master script runs five phases in order:

1. **Cleanup** (`saathratri-cleanup-dev-main.sh` / `.bat`) — deletes previously generated microservices and DTO projects, `node_modules/`, `docker-compose/`, etc.
2. **Prepare** (`saathratri-generator-code-prepare.sh` / `.bat`) — removes the old `sql-*` / `cassandra-*` folders from the installed orchestrator and copies fresh ones from the two base blueprints, then rewrites their compose namespace (`jhipster-cassandra:` / `jhipster-ai-postgresql:` → `jhipster-orchestrator:`). The rewrite is **scoped to each subtree** (cassandra refs only under `cassandra-*/`, SQL refs only under `sql-*/`) so orchestrator-native generators are never silently corrupted.
3. **Generate** (`saathratri-generate-code-dev-orchestrator-mf.sh` / `.bat`) — runs `jhipster --blueprints orchestrator jdl ... --skip-jhipster-dependencies`.
4. **Sync** (`saathratri-copy-files.sh` / `.bat`) — copies Liquibase seed data, config overrides, and entity TypeScript models from `saathratri-data/custom-files/` into the generated services.
5. **Post-generation** — copies each microservice's Angular entity models into the gateway client (`orchestratorgateway/` in the example, `jaiashirwaadclient/` in `saathratri-main/`).

### Manual Cleanup of the Copied Generators

This repo also ships `generators/cleanup.sh`, an interactive helper that deletes the copied-in `cassandra-*` / `sql-*` sub-generator directories. It is Bash-only, prompts for confirmation before deleting, and removes the directories relative to the current directory — so run it from `generators/`:

```bash
cd generators && sh cleanup.sh
```

Don't confuse it with the example workspace's `saathratri-cleanup-dev-main.sh`, which cleans the **generated example workspace** (microservices, DTO projects, `docker-compose/`, etc.) — `generators/cleanup.sh` only removes this repo's copied sub-generators (the prepare script re-copies them on the next regeneration).

### Bundled Example Apps

The example JDL (`saathratri-apps-orchestrator-mf.jdl`) merges the two upstream example JDLs — SQL entities prefixed `Psql`, Cassandra entities prefixed `Cass` — and generates:

| App                   | Database       | Notes                                                                              |
| --------------------- | -------------- | ---------------------------------------------------------------------------------- |
| `orchestratorgateway` | PostgreSQL     | Spring Cloud Gateway with microfrontends to all four services                      |
| `psqlblog`            | SQL / pgvector | `PsqlBlog`, `PsqlPost`, `PsqlTag` (vector fields), `PsqlTajUser`                   |
| `psqlstore`           | SQL            | `PsqlProduct`, `PsqlReport`                                                        |
| `cassandrablog`       | Cassandra      | Composite-key `CassBlog`/`CassPost`, `CassTag` (vectors), `Cass*` Set/Map entities |
| `cassandrastore`      | Cassandra      | `CassProduct`, `CassReport`                                                        |

Plus `docker-compose/` and a `${service}dto/` DTO Maven project per service.

---

## 📦 Sub-Generator Reference

### Orchestrator-owned sub-generators

| Sub-generator              | Purpose                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `server`                   | Creates the DTO Maven project skeleton (`pom.xml`, `mvnw`, `README.md`) in `../../${appname}dto/`                               |
| `client`                   | Routes to `sql-angular` or `cassandra-angular` by `databaseType`                                                                |
| `spring-boot`              | Routes to `sql-spring-boot` or `cassandra-spring-boot`; overrides core config templates                                         |
| `java` / `java:domain`     | SBS passthrough; routes Cassandra entities to `cassandra-java:domain`                                                           |
| `docker`                   | Routes to `sql-docker` or `cassandra-docker`; patches the Keycloak realm                                                        |
| `liquibase`                | Composes `liquibase-orchestrator`                                                                                               |
| `maven`                    | Overrides `jhipster:maven` (no-op in JHipster 8 — see note below)                                                               |
| `angular`                  | Injects Angular Material theme + `@angular/material` / `@angular/cdk` deps                                                      |
| `spring-boot-orchestrator` | SQL/Cassandra server customizations: CORS/logback/pom patches, DTO module scaffolding, `.mvn/jvm.config` (8 GB heap)            |
| `liquibase-orchestrator`   | pgvector column changelogs and `@customQueryAnnotation` / `eager` / `@entityGraph*` index changelogs, needled into `master.xml` |
| `maven-orchestrator`       | No-op (see note)                                                                                                                |
| `docker-orchestrator`      | Docker Compose customizations                                                                                                   |
| `heroku-orchestrator`      | Heroku `Procfile`, `system.properties`, `bootstrap-heroku.yml` + `heroku` Maven profile                                         |

### SQL sub-generators (from `generator-jhipster-ai-postgresql`)

| Sub-generator     | Purpose                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------- |
| `sql-spring-boot` | Entity Resource, Service, ServiceImpl, DTO (copied to DTO project), Mapper, integration tests |
| `sql-angular`     | Entity pages with human-readable FK display and AI search                                     |
| `sql-docker`      | PostgreSQL Docker Compose with pgvector and dynamic port management                           |

### Cassandra sub-generators (from `generator-jhipster-cassandra`)

| Sub-generator           | Purpose                                                                          |
| ----------------------- | -------------------------------------------------------------------------------- |
| `cassandra-spring-boot` | Entity Resource, Service, ServiceImpl, DTO/DTOId (copied to DTO project), Mapper |
| `cassandra-angular`     | Entity pages with UTC date handling and Material date pickers                    |
| `cassandra-docker`      | Cassandra Docker Compose with dynamic port management                            |
| `cassandra-java`        | Domain entities with composite primary keys and type codecs                      |
| `cassandra-client`      | i18n translations for Cassandra entities                                         |

---

## 🗂️ DTO Modularization

The orchestrator emits a **separate Maven DTO JAR project** for every microservice so other services can depend on the DTOs without pulling in the whole service.

```
jhipster-orchestrator/                  <-- example workspace (same layout in saathratri-main/)
    psqlblog/                           <-- Generated SQL microservice
    psqlblogdto/                        <-- Generated DTO JAR
        pom.xml
        src/main/java/com/saathratri/developer/psql/blog/service/dto/
            PsqlBlogDTO.java
            PsqlPostDTO.java
            ...
    cassandrablogdto/                   <-- Generated DTO JAR (Cassandra)
        src/main/java/com/saathratri/developer/cassandra/blog/service/dto/
            CassBlogDTO.java
            CassBlogDTOId.java          <-- Composite key
            ...
```

**How it works:** `server/generator.js` (WRITING) scaffolds the DTO project skeleton; the `sql-spring-boot` / `cassandra-spring-boot` generators (WRITING_ENTITIES) write each entity's DTO into both the service and the DTO project; for Cassandra composite keys a matching `DTOId` class is copied too.

Consume a DTO module with coordinates `<packageName>.dto : <baseName>dto : 2.0.0`:

```xml
<dependency>
    <groupId>com.saathratri.developer.psql.blog.dto</groupId>
    <artifactId>psqlblogdto</artifactId>
    <version>2.0.0</version>
</dependency>
```

---

## 🧪 JDL — Custom Annotations

The orchestrator and its composed blueprints process several custom annotation types in the JDL.

### `DISPLAY_IN_GUI_RELATIONSHIP_LINK` — Human-Readable Foreign Keys

Controls which fields are shown in relationship dropdowns and links in the Angular UI. The second annotation value is the **separator** used when concatenating multiple display fields (`""`, `" "`, `", "`, `"-"`).

```jdl
entity PsqlBlog {
    @customAnnotation("DISPLAY_IN_GUI_RELATIONSHIP_LINK") @customAnnotation("-") name String required minlength(3)
    @customAnnotation("DISPLAY_IN_GUI_RELATIONSHIP_LINK") @customAnnotation("-") handle String required minlength(2)
}
```

### `VECTOR` — AI Semantic Search (pgvector)

Marks fields for pgvector embedding storage and AI-powered search. The field name must follow the `<sourceField>Embedding` pattern; dimension `1536` matches OpenAI's `text-embedding-3-small`.

```jdl
entity PsqlTag {
    @customAnnotation("VECTOR") @customAnnotation("1536") nameEmbedding Blob
    @customAnnotation("VECTOR") @customAnnotation("1536") descriptionEmbedding Blob
}
```

Generates a `vector(1536)` column, an HNSW index, embedding generation on save, and a cosine-similarity search API.

### Cassandra Primary Keys & Column Types

```jdl
@Id @customAnnotation("PrimaryKeyType.PARTITIONED") @customAnnotation("CassandraType.Name.UUID") organizationId UUID
@customAnnotation("PrimaryKeyType.CLUSTERED") @customAnnotation("CassandraType.Name.TEXT") accountNumber String
@customAnnotation("CassandraType.Name.MAP") @customAnnotation("CassandraType.Name.TEXT") detailsText String
@customAnnotation("CassandraType.Name.BIGINT") @customAnnotation("UTC_DATETIME") createdDate Long
```

For the full Cassandra composite-key / `SET` / `MAP` / vector JDL catalogue, see the [`generator-jhipster-cassandra` README](https://github.com/saathratri/generator-jhipster-cassandra#-jdl-examples).

---

## 🛠️ Template Override Strategy

The orchestrator overrides only the templates that need Saathratri-specific changes:

| Area           | Template(s)                                                                        | Saathratri Change                                                                                      |
| -------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Backend config | `application.yml`, `application-dev.yml`, `application-prod.yml`, `bootstrap*.yml` | CORS `DedupeResponseHeader`, Keycloak/Auth0 OIDC, Astra DB + S3, Eureka/JWT secrets                    |
| Backend code   | `Application.java`, `ApplicationProperties.java`, `pom.xml`                        | `CqlSession` bean, AWS S3 + Astra DB properties, S3 SDK dependency                                     |
| Frontend       | `package.json`, `global.scss`                                                      | `@angular/material` / `@angular/cdk`, Material theme CSS import                                        |
| Docker         | `jhipster-realm.json`                                                              | `saathratri-client-id` service account, `spa_app` client, `organizationIds` mapper, `read:users` scope |

Every change is marked: `<%# --- SAATHRATRI CHANGE: ... --- %>` (EJS), `# --- SAATHRATRI CHANGE: ... ---` (YAML), `// --- SAATHRATRI CHANGE: ... ---` (Java).

---

## 🔬 Testing

There are two layers of tests: the **blueprint's own unit tests**, and the **generated application's tests** (backend + frontend, produced by the two composed blueprints and covered by their guides).

### Generator unit tests

The Vitest suite (`generators/*/generator.spec.js`) mixes snapshot specs inherited from the composed `sql-*` / `cassandra-*` sub-generators with **behavioral content specs** for the orchestrator's own sub-generators (Heroku profile, CORS/logback patches, DTO module, pgvector changelogs, Keycloak service-account client, db dispatch).

Run **in this repo** (Node 22+):

```bash
npx vitest run
```

Expected: **Test Files 21 passed (21) / Tests 52 passed (52)**.

> **Use `npx vitest run`, not `npm test`.** `npm test` runs a `pretest` = `prettier-check && eslint .` gate first, which is pre-existing red across the repo, so `npm test` aborts before Vitest. After an intended change to which files a sub-generator writes, refresh snapshots with `npm run update-snapshot` and inspect `git diff generators/*/__snapshots__/`.

> **`maven-orchestrator` is a no-op.** It overrides `jhipster:maven`, but JHipster 8 runs `java-simple-application:maven`, so it never executes. The 8 GB `.mvn/jvm.config` heap override it was meant to write now lives in `spring-boot-orchestrator` POST_WRITING. See [`TESTING.md`](TESTING.md) §2.4.

The suite stays green across regenerations because the prepare phase rewrites the namespace prefix of the copied specs (`jhipster-ai-postgresql:` / `jhipster-cassandra:` → `jhipster-orchestrator:`). When adding a spec: custom-named sub-generators use `jhipster-orchestrator:<name>`; core-name overrides (`server`, `client`, `angular`, `docker`, `java`, `spring-boot`) use `jhipster:<name>`.

### Debugging test failures

The golden rule is **fix the templates, never the generated app** (it is overwritten on every regeneration) — and for this _assembled_ blueprint, fix `sql-*` / `cassandra-*` template bugs in the **base repos**, not in this repo's copies. The full runbook is in **[`TESTING.md`](TESTING.md)**. For the generated-app backend/frontend bug catalogues, see the companion [`generator-jhipster-cassandra/TESTING.md`](https://github.com/saathratri/generator-jhipster-cassandra/blob/main/TESTING.md) and [`generator-jhipster-ai-postgresql/TESTING.md`](https://github.com/saathratri/generator-jhipster-ai-postgresql/blob/main/TESTING.md).

### E2E (Cypress) & custom widgets

The orchestrator does **not** own a Cypress sub-generator — the `cypress` test passes flow in automatically from each base blueprint on every regen. Fix Cypress codegen bugs in the base repos. The SET / MAP / date-time `data-cy` widget hooks are owned by `cassandra-angular`; see the cassandra blueprint's [README §E2E Testing with Cypress](https://github.com/saathratri/generator-jhipster-cassandra#e2e-testing-with-cypress).

---

## 🔐 Identity Providers

The generated platform uses **Keycloak** by default (the orchestrator patches `jhipster-realm.json` with the `saathratri-client-id` service account, `spa_app` client, and an `organizationIds` protocol mapper). Production templates switch to **Auth0** OIDC. You can also switch to Okta with:

```bash
okta apps create jhipster
```

---

## 🧯 Troubleshooting

| Symptom                                                 | Fix                                                                                                                                    |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `"Could not retrieve version of blueprint"`             | Cosmetic warning — sub-generators don't export version info. Generation proceeds normally.                                             |
| `"Generator xyz was not found"`                         | Run the prepare script after `npm link` — it copies the `sql-*` / `cassandra-*` generators in.                                         |
| `this.parseJHipsterArguments is not a function`         | Removed in JHipster 9 — delete the call.                                                                                               |
| `method: 'copy'` template errors                        | Removed in JHipster 9 — use `binary: true` (binary) or `noEjs: true` (text).                                                           |
| `jhipsterConfigWithDefaults.packageFolder` is undefined | Use `(data) => data.packageFolder` in `renameTo` callbacks.                                                                            |
| `this.dateFormatForLiquibase is not a function`         | Removed in JHipster 9 — format the timestamp inline.                                                                                   |
| XML comment errors in `pom.xml`                         | Use EJS comments `<%# ... %>`, not XML `<!-- ... -->` (XML disallows `--` inside comments).                                            |
| DTO projects not generated                              | Ensure `server` exists in the global install (`npm link`), the prepare script ran, and `renameTo` uses `(data) => data.packageFolder`. |

---

## 🧐 Learn More

- 📘 [JHipster Blueprints](https://www.jhipster.tech/modules/creating-a-blueprint/)
- 📘 [Cassandra Data Modeling](https://cassandra.apache.org/doc/latest/data-modeling/)
- 📘 [pgvector](https://github.com/pgvector/pgvector)
- 🧓 [Matt Raible on Micro Frontends](https://auth0.com/blog/micro-frontends-for-java-microservices/)
- ☕️ Companion blueprint: [generator-jhipster-ai-postgresql](https://github.com/saathratri/generator-jhipster-ai-postgresql)
- ☕️ Companion blueprint: [generator-jhipster-cassandra](https://github.com/saathratri/generator-jhipster-cassandra)

---

## 👏 Acknowledgements

Huge thanks to:

- [yelhouti](https://github.com/yelhouti)
- [Jeremy Artero](https://www.linkedin.com/in/jeremyartero/)
- [Matt Raible](https://github.com/mraible)
- [Gaël Marziou](https://github.com/gmarziou)
- [Cedrick Lunven](https://www.linkedin.com/in/clunven/)
- [Christophe Bornet](https://www.linkedin.com/in/christophe-bornet-bab1193/)
- [Disha Patel](https://www.linkedin.com/in/dishapatel860/)
- [Catherine Guevara](https://www.linkedin.com/in/catherine-guevara-1a5375b1/)

---

## About

Published and maintained by **Saathratri, LLC**, a Florida-based software company building
hospitality software for hotels, motels, inns, restaurants, and cafes. The microservices behind the
Saathratri platform are generated with this blueprint.

- Website: [saathratri.com](https://www.saathratri.com)
- GitHub: [github.com/saathratri](https://github.com/saathratri)
- npm: [npmjs.com/~amarppatel](https://www.npmjs.com/~amarppatel)
- LinkedIn: [linkedin.com/company/saathratri](https://www.linkedin.com/company/saathratri/)

Authored by [Amar P. Patel](https://amarppatel.com), founder of Saathratri, LLC — 24+ years
building enterprise Java/Spring systems, microservices, and AI-powered platforms, and holder of two
U.S. patents. [github.com/amarpatel-xx](https://github.com/amarpatel-xx) ·
[linkedin.com/in/amar-p-patel](https://www.linkedin.com/in/amar-p-patel/)
