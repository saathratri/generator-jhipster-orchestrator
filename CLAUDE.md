# JHipster Orchestrator Blueprint - Development Guide for Claude

## Project Overview

**generator-jhipster-orchestrator** is a custom JHipster 9 blueprint designed for the Saathratri project. It extends JHipster's default generation capabilities to support microservices architecture with specialized handling for both SQL (PostgreSQL) and Cassandra databases.

**Version:** 1.0.3
**JHipster Version:** 9.1.0
**Blueprint Type:** Side-by-Side (works alongside default JHipster generators)

## Key Architectural Concepts

### 1. Side-by-Side Blueprint Pattern

- Uses `sbsBlueprint: true` to complement (not replace) JHipster's generators
- Allows selective overriding of specific generation phases
- Maintains compatibility with JHipster's core functionality

### 2. Database-Specific Generator Chains

The blueprint uses a delegation pattern where base generators delegate to database-specific implementations:

```
server → sql-spring-boot → heroku-orchestrator (for SQL)
server → cassandra-spring-boot → heroku-orchestrator (for Cassandra)
client → sql-angular (for SQL)
client → cassandra-angular (for Cassandra)
docker → sql-docker (for SQL)
docker → cassandra-docker (for Cassandra)
```

### 3. JHipster Generator Lifecycle

All generators follow this priority/phase sequence:

1. INITIALIZING
2. PROMPTING
3. CONFIGURING
4. COMPOSING
5. LOADING
6. PREPARING
7. PREPARING_EACH_ENTITY
8. DEFAULT
9. WRITING
10. WRITING_ENTITIES
11. POST_WRITING
12. INSTALL
13. END

## Project Structure

```
generator-jhipster-orchestrator/
├── cli/
│   └── cli.cjs                          # CLI entry point with custom logo
├── generators/
│   ├── app/                             # Main application generator
│   ├── server/                          # Server entry point (delegates to DB-specific)
│   ├── client/                          # Client entry point (delegates to framework-specific)
│   ├── spring-boot/                     # Base Spring Boot configuration
│   ├── java/                            # Java domain customizations
│   │
│   ├── sql-spring-boot/                 # SQL-specific backend logic
│   │   ├── generator.js
│   │   ├── templates/
│   │   └── utils/
│   │       ├── dto-utils.js             # DTO generation utilities
│   │       └── sql-utils.js             # SQL-specific utilities
│   │
│   ├── sql-angular/                     # SQL-specific Angular UI
│   ├── sql-docker/                      # PostgreSQL with pgvector
│   │
│   ├── cassandra-spring-boot/           # Cassandra backend logic
│   │   ├── templates/
│   │   └── utils/
│   │       ├── cassandra-composite-key-utils.js  # Composite key handling
│   │       └── cassandra-utils.js                # Cassandra-specific utilities
│   │
│   ├── cassandra-spring-data-cassandra/ # Repository layer
│   ├── cassandra-java-domain/           # Domain entity customizations
│   ├── cassandra-angular/               # Angular Material components
│   ├── cassandra-docker/                # Cassandra Docker config
│   ├── cassandra-languages/             # i18n for Cassandra
│   │
│   ├── docker/                          # Docker + Keycloak
│   ├── cypress/                         # E2E testing
│   ├── heroku-orchestrator/              # Heroku deployment
│   └── spring-boot-orchestrator/         # App skeleton + config (Application.java, *.yml, pom.xml)
│
├── .yo-rc.json                          # Blueprint configuration
├── package.json                         # Dependencies and scripts
├── tsconfig.json                        # TypeScript configuration
└── vitest.config.ts                     # Test configuration
```

## Key Customizations and Features

### 1. DTO Generation for Microservices

**Location:** `generators/sql-spring-boot/utils/dto-utils.js`

The blueprint automatically generates DTOs in a separate module:

- **Module path:** `../${appname}dto/`
- **Purpose:** Enable clean separation between service layer and data layer
- **Generated files:** DTO classes corresponding to JPA entities

**Key Functions:**

- `getDtoImportFullTypeWithEnums(entity)` - Get import statements for DTOs
- Template processing in `sql-spring-boot/templates/src/main/java/_package_/_entityPackage_/service/dto/`

### 2. Composite Primary Key Support (Cassandra)

**Location:** `generators/cassandra-spring-boot/utils/cassandra-composite-key-utils.js`

Handles complex Cassandra primary keys using custom annotations:

- `@customAnnotation("PrimaryKeyType.PARTITIONED")` - Partition key fields
- `@customAnnotation("PrimaryKeyType.CLUSTERED")` - Clustering key fields

**Key Functions:**

```javascript
getCompositeKeyClassImportFullType(entity); // Get composite key class imports
getCompositeIdFieldInEntity(fields); // Extract composite ID field
getListOfIdFields(fields); // Get all ID fields
getPartitionedKeyFields(fields); // Get partition key fields
getClusteredKeyFields(fields); // Get clustering key fields
```

**Generated Components:**

- Composite key classes (e.g., `EntityId.java`)
- Custom equals/hashCode for composite keys
- Proper field ordering (partitioned → clustered → regular)

### 3. Advanced Date/Time Handling (Cassandra)

**Storage Strategy:** UTC dates stored as Unix timestamps (Long)

**Backend:**

- Fields: `LocalDate` and `ZonedDateTime` in Java
- Storage: Unix milliseconds (Long) in Cassandra
- Conversion: Automatic via custom getters/setters

**Frontend (Angular):**

- `ConvertFromDateLongToDayjs` pipe - Convert Long → Dayjs
- `FormatMediumDatetime` pipe - Format for display
- Angular Material date pickers integrated
- Custom validators for date ranges

**Key Files:**

- `generators/cassandra-angular/templates/src/main/webapp/app/shared/date/`
- `generators/cassandra-spring-boot/templates/.../domain/_persistClass_Entity_.java.ejs`

### 4. Cassandra Collection Types (Map/Set)

**Set Fields:**

- Custom Angular component: `entity-field-set-update.component.ts`
- Add/remove items from Set<String>, Set<Long>, etc.

**Map Fields:**

- Custom Angular dialog: `entity-map-field-edit-dialog.component.ts`
- Supports: Boolean, String, Number, Dayjs values
- Edit dialog with key-value pair management

**Key Files:**

- `generators/cassandra-angular/templates/src/main/webapp/app/entities/set-field/`
- `generators/cassandra-angular/templates/src/main/webapp/app/entities/map-field/`

### 5. Dynamic Port Management

**Purpose:** Prevent port conflicts in microservices development

**SQL Port Management:**

- File: `generators/sql-spring-boot/utils/last-used-port.json`
- Tracks last PostgreSQL port (starts at 5433)
- Auto-increments for each new service

**Cassandra Port Management:**

- File: `generators/cassandra-docker/utils/last-used-ports.json`
- Tracks multiple ports: CQL (9042+), JMX (7199+), Thrift (9160+), Storage (7000+)
- Manages port ranges to avoid conflicts

**Key Functions:**

- `getAndUpdateLastUsedPostgreSQLPort()` in `sql-utils.js`
- Port assignment in `cassandra-utils.js`

### 6. Custom Annotations for Display

**`@customAnnotation("DISPLAY_IN_GUI_RELATIONSHIP_LINK")`**

- Applied to entity fields
- Marks which field to display when showing relationships in UI
- Example: Show `name` field instead of `id` in dropdowns

**Usage in `.jhipster/Entity.json`:**

```json
{
  "fields": [
    {
      "fieldName": "name",
      "fieldType": "String",
      "customAnnotations": ["DISPLAY_IN_GUI_RELATIONSHIP_LINK"]
    }
  ]
}
```

### 7. Service Layer Patterns

> **Note:** These per-entity service templates live in the **copied** `sql-spring-boot` /
> `cassandra-spring-boot` generators (assembled in from the base blueprints each regen), **not** in
> `spring-boot-orchestrator`. Fix them in the base repos (`generator-jhipster-ai-postgresql` /
> `generator-jhipster-cassandra`), never in the orchestrator's copies. `spring-boot-orchestrator`
> itself only emits the app skeleton + config (`Application.java`, `application*.yml`, `pom.xml`).

**QueryService Pattern (SQL):**

- Template: `generators/sql-spring-boot/templates/src/main/java/_package_/_entityPackage_/service/_entityClass_QueryService.java.ejs`
- Generates `EntityQueryService` for complex filtering
- Uses Spring Data JPA Specifications
- Enables dynamic query construction

**ServiceImpl Pattern:**

- Interface + Implementation separation
- Templates: `_entityClass_Service.java.ejs` + `service/impl/_entityClass_ServiceImpl.java.ejs`
  under `generators/sql-spring-boot/templates/...` (SQL) and
  `generators/cassandra-spring-boot/templates/...` (Cassandra)
- Includes CRUD operations and custom business logic

## Development Workflows

### Adding a New Generator

1. **Create directory structure:**

   ```
   generators/my-new-generator/
   ├── generator.js      # Main generator logic
   ├── command.js        # CLI command definition
   ├── index.js          # Module export
   ├── templates/        # EJS templates
   └── utils/            # Utility functions
   ```

2. **Basic generator.js structure:**

   ```javascript
   import BaseApplicationGenerator from 'generator-jhipster/generators/base-application';

   export default class extends BaseApplicationGenerator {
     constructor(args, opts, features) {
       super(args, opts, { ...features, sbsBlueprint: true });
     }

     get [BaseApplicationGenerator.INITIALIZING]() {
       return this.asInitializingTaskGroup({
         async initTask() {
           // Initialization logic
         },
       });
     }

     get [BaseApplicationGenerator.WRITING]() {
       return this.asWritingTaskGroup({
         async writeTask() {
           await this.writeFiles({
             sections: {
               files: [
                 {
                   templates: ['template-file.ejs'],
                 },
               ],
             },
             context: this,
           });
         },
       });
     }
   }
   ```

3. **Register in parent generator:**
   Add composition in relevant parent (e.g., `server/generator.js`):
   ```javascript
   async composingTaskGroup() {
     await this.composeWithJHipster('my-new-generator');
   }
   ```

### Modifying Entity Generation

**For SQL entities:**

1. Edit templates in `generators/sql-spring-boot/templates/`
2. Key templates:
   - `src/main/java/_package_/_entityPackage_/domain/_persistClass_.java.ejs`
   - `src/main/java/_package_/_entityPackage_/service/_entityClass_Service.java.ejs`

**For Cassandra entities:**

1. Edit templates in `generators/cassandra-java-domain/templates/`
2. Handle composite keys in `cassandra-spring-boot/utils/cassandra-composite-key-utils.js`
3. Update Angular UI in `generators/cassandra-angular/templates/`

### Adding Custom Annotations

1. **Define in entity JSON:**
   `.jhipster/Entity.json` → add to `customAnnotations` array

2. **Process in generator:**

   ```javascript
   entity.fields.forEach(field => {
     const hasCustomAnnotation = field.customAnnotations?.includes('MY_ANNOTATION');
     if (hasCustomAnnotation) {
       // Custom logic here
     }
   });
   ```

3. **Use in templates:**
   ```ejs
   <%_ for (const field of fields) { _%>
     <%_ if (field.customAnnotations?.includes('MY_ANNOTATION')) { _%>
       // Custom code for annotated field
     <%_ } _%>
   <%_ } _%>
   ```

### Testing Generators

**Run tests:**

```bash
npm run test                    # Run all tests
npm run test -- generators/sql-spring-boot/generator.spec.js  # Specific test
```

**Test structure (using Vitest):**

```javascript
import { describe, it, expect } from 'vitest';
import { helpers } from 'yeoman-test';

describe('generator - my-generator', () => {
  it('should generate files', async () => {
    const result = await helpers.create('jhipster:my-generator').withOptions({ blueprint: 'orchestrator' }).run();

    result.assertFile(['expected-file.java']);
  });
});
```

## Utility Functions Reference

### SQL Utils (`sql-spring-boot/utils/sql-utils.js`)

```javascript
getAndUpdateLastUsedPostgreSQLPort(); // Get next available PostgreSQL port
```

### DTO Utils (`sql-spring-boot/utils/dto-utils.js`)

```javascript
getDtoImportFullTypeWithEnums(entity); // Get DTO import statements
```

### Cassandra Composite Key Utils

```javascript
getCompositeKeyClassImportFullType(entity); // Composite key imports
getCompositeIdFieldInEntity(fields); // Get composite ID field
getListOfIdFields(fields); // All ID fields
getPartitionedKeyFields(fields); // Partition keys
getClusteredKeyFields(fields); // Clustering keys
hasCompositePrimaryKey(fields); // Check if composite key exists
```

### Cassandra Utils (`cassandra-spring-boot/utils/cassandra-utils.js`)

```javascript
// Port management and configuration utilities
```

## Configuration Files

### .yo-rc.json

Blueprint metadata and generator configuration:

```json
{
  "generator-jhipster-orchestrator": {
    "baseName": "orchestrator",
    "jhipsterVersion": "9.0.0",
    "generators": ["app", "client", "cypress", "docker", "entity", "server", "spring-boot", "heroku"]
  }
}
```

### package.json

Key scripts:

```bash
npm run lint           # Check code quality
npm run lint-fix       # Auto-fix linting issues
npm run prettier-format # Format all files
npm run ejslint        # Validate EJS templates
npm run test           # Run tests
```

## Common Patterns

### 1. Accessing Application Configuration

```javascript
const { baseName, packageName, databaseType } = this.jhipsterConfigWithDefaults;
```

### 2. Delegating to Sub-Generators

```javascript
async composeWithJHipster(generatorName) {
  await this.composeWithJHipster(`orchestrator:${generatorName}`);
}
```

### 3. Conditional Template Rendering

```ejs
<%_ if (databaseType === 'cassandra') { _%>
  // Cassandra-specific code
<%_ } else if (databaseType === 'sql') { _%>
  // SQL-specific code
<%_ } _%>
```

### 4. Iterating Over Entities

```javascript
for (const entity of entities) {
  // Process each entity
  const fields = entity.fields;
  const relationships = entity.relationships;
}
```

### 5. Field Type Checking

```javascript
const isDate = field.fieldType === 'LocalDate';
const isDateTime = field.fieldType === 'ZonedDateTime' || field.fieldType === 'Instant';
const isEnum = field.fieldIsEnum;
const isRelationship = field.fieldType.includes('.');
```

## Troubleshooting

### Common Issues

**1. Generator not found:**

- Ensure `index.js` exports the generator properly
- Check that generator is registered in parent's composition

**2. Template not rendering:**

- Verify template path in `writeFiles` section
- Check context variables are passed correctly
- Validate EJS syntax with `npm run ejslint`

**3. Port conflicts:**

- Check `last-used-port.json` or `last-used-ports.json`
- Manually reset port if needed
- Ensure port increment logic is working

**4. Composite key issues (Cassandra):**

- Verify `PrimaryKeyType.PARTITIONED` and `CLUSTERED` annotations
- Check field ordering in generated composite key class
- Ensure at least one partitioned key exists

**5. DTO generation fails:**

- Check entity has proper relationships configured
- Verify DTO templates exist
- Ensure DTO module path is correct

## Technology Stack

**Backend:**

- Java 17+
- Spring Boot 3.x
- Spring Data JPA (SQL) / Spring Data Cassandra (NoSQL)
- PostgreSQL with pgvector extension
- Apache Cassandra
- Maven

**Frontend:**

- Angular 17+
- Angular Material (Cassandra apps)
- TypeScript 5.x
- Dayjs (date/time)
- Webpack with microfrontend support

**DevOps:**

- Docker / Docker Compose
- Keycloak (authentication)
- Heroku (deployment)

**Build Tools:**

- Yeoman (generator framework)
- EJS (templating)
- Vitest (testing)
- ESLint + Prettier (code quality)

## Best Practices

1. **Always use `sbsBlueprint: true`** to maintain compatibility
2. **Follow JHipster lifecycle priorities** - don't skip phases
3. **Use utility functions** instead of duplicating logic
4. **Test generators** with `yeoman-test` and Vitest
5. **Validate templates** with `npm run ejslint` before committing
6. **Document custom annotations** in entity JSON files
7. **Keep port management files** under version control
8. **Use TypeScript types** for better IDE support
9. **Follow existing code style** - run `npm run prettier-format`
10. **Handle both SQL and Cassandra** when modifying common generators

## File References for Common Tasks

| Task                                                           | Primary Files                                                                                                                                |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Add SQL entity template                                        | `generators/sql-spring-boot/templates/src/main/java/_package_/_entityPackage_/domain/`                                                       |
| Add Cassandra entity template                                  | `generators/cassandra-java-domain/templates/src/main/java/_package_/_entityPackage_/domain/`                                                 |
| Modify DTO generation                                          | `generators/sql-spring-boot/utils/dto-utils.js`                                                                                              |
| Change composite key logic                                     | `generators/cassandra-spring-boot/utils/cassandra-composite-key-utils.js`                                                                    |
| Update Angular UI (SQL)                                        | `generators/sql-angular/templates/src/main/webapp/app/entities/`                                                                             |
| Update Angular UI (Cassandra)                                  | `generators/cassandra-angular/templates/src/main/webapp/app/entities/`                                                                       |
| Modify entity service layer (Service/ServiceImpl/QueryService) | `generators/sql-spring-boot/templates/.../service/` or `generators/cassandra-spring-boot/templates/.../service/` (copied — fix in base repo) |
| Change app skeleton/config (Application.java, \*.yml, pom)     | `generators/spring-boot-orchestrator/templates/`                                                                                             |
| Modify Docker setup                                            | `generators/sql-docker/` or `generators/cassandra-docker/`                                                                                   |
| Change Heroku config                                           | `generators/heroku-orchestrator/templates/`                                                                                                  |
| Add test cases                                                 | `generators/[generator-name]/generator.spec.js`                                                                                              |

## Quick Start for Development

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Link blueprint locally:**

   ```bash
   npm link
   ```

3. **Test in a sample project:**

   ```bash
   mkdir test-app && cd test-app
   jhipster --blueprints orchestrator
   ```

4. **Make changes and test:**

   ```bash
   npm run lint
   npm run test
   npm run prettier-format
   ```

5. **Debug generator:**
   - Add `debugger;` statements in generator.js
   - Run with Node inspector: `node --inspect-brk $(which jhipster) --blueprints orchestrator`

## Resources

- **JHipster Documentation:** https://www.jhipster.tech/
- **Blueprint Documentation:** https://www.jhipster.tech/modules/creating-a-blueprint/
- **Yeoman API:** https://yeoman.io/authoring/
- **EJS Syntax:** https://ejs.co/#docs

## Summary

This blueprint demonstrates advanced JHipster customization with:

- Database-specific generator chains
- Composite primary key support for Cassandra
- DTO generation for microservices
- Advanced date/time handling with UTC storage
- Dynamic port management
- Custom Angular Material components for complex data types
- Service layer patterns (QueryService, ServiceImpl)
- Heroku deployment automation

When extending this blueprint, always consider both SQL and Cassandra paths, maintain the side-by-side pattern, and follow JHipster's generator lifecycle for consistent behavior.
