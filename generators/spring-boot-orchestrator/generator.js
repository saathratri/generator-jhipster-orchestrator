/*
 * Copyright (c) 2026 Saathratri, LLC.
 * SPDX-License-Identifier: MIT
 * Licensed under the MIT License; see LICENSE in the repository root.
 */

import fs from 'node:fs';

import BaseApplicationGenerator from 'generator-jhipster/generators/base-application';

import { useSaathratriAiBom } from './saathratri-ai-bom.js';
import { platformVersionOf, usePlatformVersion } from './saathratri-platform-version.js';

// Larger Maven heap for MapStruct annotation processing on SQL services. This lives here (not in
// maven-orchestrator) because the orchestrator's `maven` router overrides `jhipster:maven`, which
// JHipster 8 never runs (it runs `java-simple-application:maven`), so maven-orchestrator never
// executes. spring-boot-orchestrator provably runs for microservices and the gateway, and already
// patches pom.xml here. Written as literal content in POST_WRITING so it deterministically
// overwrites the empty .mvn/jvm.config the base java/maven generator emits in WRITING.
const JVM_CONFIG_CONTENT = '-Xmx8g -Xms2g -XX:+UseParallelGC -XX:ParallelGCThreads=4\n';

export default class extends BaseApplicationGenerator {
  constructor(args, opts, features) {
    // allowDestinationOutsideRoot: yeoman-generator 9 (JHipster 9.4.0) throws when a destination
    // resolves outside the app root. This generator deliberately writes the sibling
    // `../<baseName>dto/` Maven module (pom, mvnw, wrapper, README, .gitignore, copied DTOs).
    super(args, opts, { ...features, sbsBlueprint: true, allowDestinationOutsideRoot: true });
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
      async composingTemplateTask() {
        // maven-orchestrator is composed by the maven router; do not compose it here.
      },
    });
  }

  get [BaseApplicationGenerator.COMPOSING_COMPONENT]() {
    return this.asComposingComponentTaskGroup({
      async composingComponentTemplateTask() {},
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
        // Saathratri infrastructure files: pom.xml, Application.java, ApplicationProperties.java,
        // application*.yml, bootstrap*.yml — applied to all microservices and the gateway,
        // regardless of database type. SBS template-override doesn't pick these up because
        // spring-boot-orchestrator is composed (not a direct SBS of 'spring-boot'), so write
        // them programmatically here.
        if (!(application.applicationTypeMicroservice || application.applicationTypeGateway)) {
          return;
        }

        await this.writeFiles({
          sections: {
            files: [
              {
                templates: [
                  'template-file-spring-boot-orchestrator',
                  // pom.xml is NOT written here — upstream JHipster writes the
                  // base pom.xml. The one Saathratri customization (AWS S3 SDK
                  // for Cassandra Astra DB) is applied via editFile in
                  // POST_WRITING (patchAwsSdkInPomForCassandra).
                  {
                    sourceFile: 'src/main/resources/config/application.yml.ejs',
                    destinationFile: () => 'src/main/resources/config/application.yml',
                  },
                  // application-dev.yml is intentionally NOT written here.
                  // sql-spring-boot and cassandra-spring-boot each write their own version
                  // with database-specific customizations (custom JDBC port allocation,
                  // ?stringtype=unspecified for pgvector, custom Cassandra CQL ports).
                  // If we wrote it here too, last-writer-wins races would clobber those.
                  // Cross-cutting tweaks live in the POST_WRITING editFile() patches below.
                  {
                    sourceFile: 'src/main/resources/config/application-prod.yml.ejs',
                    destinationFile: () => 'src/main/resources/config/application-prod.yml',
                  },
                  {
                    sourceFile: 'src/main/resources/config/bootstrap.yml.ejs',
                    destinationFile: () => 'src/main/resources/config/bootstrap.yml',
                  },
                  {
                    sourceFile: 'src/main/resources/config/bootstrap-prod.yml.ejs',
                    destinationFile: () => 'src/main/resources/config/bootstrap-prod.yml',
                  },
                  {
                    sourceFile: 'src/main/java/_package_/Application.java.ejs',
                    destinationFile: ctx => `src/main/java/${ctx.packageFolder}/${ctx.mainClass}.java`,
                  },
                  {
                    sourceFile: 'src/main/java/_package_/config/ApplicationProperties.java.ejs',
                    destinationFile: ctx => `src/main/java/${ctx.packageFolder}/config/ApplicationProperties.java`,
                  },
                ],
              },
            ],
          },
          context: application,
        });

        // Write DTO module scaffolding (pom.xml, mvnw, mvnw.cmd, README.md,
        // .mvn/wrapper/maven-wrapper.properties) to the sibling ${baseName}dto/
        // Maven module for microservices only (gateway doesn't need a shared DTO JAR).
        // Moved here from server/generator.js to keep base generators stub-only.
        if (application.applicationTypeMicroservice) {
          await this.writeFiles({
            sections: {
              files: [
                {
                  path: 'maven/',
                  templates: [
                    {
                      file: 'pom.xml',
                      renameTo: () => `../../${this.appname}dto/pom.xml`,
                    },
                    {
                      file: 'mvnw',
                      binary: true,
                      renameTo: () => `../../${this.appname}dto/mvnw`,
                    },
                    {
                      file: 'mvnw.cmd',
                      binary: true,
                      renameTo: () => `../../${this.appname}dto/mvnw.cmd`,
                    },
                    {
                      file: 'README.md',
                      binary: true,
                      renameTo: () => `../../${this.appname}dto/README.md`,
                    },
                    {
                      file: '.mvn/wrapper/maven-wrapper.properties',
                      binary: true,
                      renameTo: () => `../../${this.appname}dto/.mvn/wrapper/maven-wrapper.properties`,
                    },
                  ],
                },
              ],
            },
            // ADR-068 (saathratri repo): the DTO jar carries the ONE platform version, like its service.
            context: {
              ...application,
              dtoFolderName: `${this.appname}dto`,
              saathratriPlatformVersion: this.saathratriPlatformVersion() ?? '0.0.1-SNAPSHOT',
            },
          });
        }
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
      async writeJvmConfigForSql({ application }) {
        // SQL services (gateway + SQL microservices) get an enlarged Maven heap so MapStruct
        // annotation processing doesn't OOM. Overwrites the empty .mvn/jvm.config the base
        // java/maven generator writes (POST_WRITING runs after that WRITING). SQL-only by intent;
        // Cassandra services keep the default heap.
        if (!(application.applicationTypeMicroservice || application.applicationTypeGateway)) {
          return;
        }
        if (!application.databaseTypeSql || application.buildToolMaven === false) {
          return;
        }
        this.writeDestination(this.destinationPath('.mvn/jvm.config'), JVM_CONFIG_CONTENT);
      },

      async patchCorsInApplicationDevYml({ application }) {
        // Enable CORS for microservices in the dev profile so the Jai Ashirwaad Angular
        // client (4200) and the gateway proxy (8080) can hit microservice endpoints directly
        // during local development. JHipster's stock template leaves microservice CORS
        // commented out; we replace that block with an active config.
        //
        // The gateway already enables CORS in its own dev template via the upstream
        // devServerPort/microfrontend EJS logic, so we skip it here.
        //
        // This lives here (not in the sql-spring-boot or cassandra-spring-boot .ejs
        // templates) because saathratri-generator-code-prepare.bat wipes those subtrees
        // on every prepare and re-copies them from generator-jhipster-orchestrator and
        // generator-jhipster-orchestrator respectively. spring-boot-orchestrator/ is
        // preserved across prepare, so POST_WRITING editFile() is the durable home.
        if (!application.applicationTypeMicroservice) {
          return;
        }

        const appDevYmlPath = 'src/main/resources/config/application-dev.yml';

        this.editFile(appDevYmlPath, content => {
          // Idempotent: skip if we've already swapped the block in.
          if (content.includes('SAATHRATRI CHANGE: Enable CORS in dev for Jai Ashirwaad Client')) {
            return content;
          }

          // Match the commented-out CORS block produced by the upstream JHipster template.
          // NB: mem-fs buffers on Windows use CRLF even when the final file on disk is LF,
          // so the line-break matcher must be `\r?\n` (plain `\n` silently fails to match).
          const commentedCorsBlock =
            / {2}# CORS is disabled by default on microservices, as you should access them through a gateway\.\r?\n {2}# If you want to enable it, please uncomment the configuration below\.\r?\n {2}# cors:\r?\n {2}# {3}allowed-origins: "http:\/\/localhost:9000,https:\/\/localhost:9000"\r?\n {2}# {3}allowed-methods: "\*"\r?\n {2}# {3}allowed-headers: "\*"\r?\n {2}# {3}exposed-headers: "Authorization,Link,X-Total-Count"\r?\n {2}# {3}allow-credentials: true\r?\n {2}# {3}max-age: 1800\r?\n/;

          const activeCorsBlock =
            '  # --- SAATHRATRI CHANGE: Enable CORS in dev for Jai Ashirwaad Client ---\n' +
            '  # Allows Angular clients (4200-4209) and the gateway proxy (8080) to call this\n' +
            '  # microservice directly during local development.\n' +
            '  cors:\n' +
            '    allowed-origins: "http://localhost:4200,https://localhost:4200,http://localhost:4201,https://localhost:4201,http://localhost:4202,https://localhost:4202,http://localhost:4203,https://localhost:4203,http://localhost:4204,https://localhost:4204,http://localhost:4205,https://localhost:4205,http://localhost:4206,https://localhost:4206,http://localhost:4207,https://localhost:4207,http://localhost:4208,https://localhost:4208,http://localhost:4209,https://localhost:4209,http://localhost:8080"\n' +
            '    allowed-methods: "*"\n' +
            '    allowed-headers: "*"\n' +
            '    exposed-headers: "Authorization,Link,X-Total-Count"\n' +
            '    allow-credentials: true\n' +
            '    max-age: 1800\n' +
            '  # --- END SAATHRATRI CHANGE ---\n';

          return content.replace(commentedCorsBlock, activeCorsBlock);
        });
      },

      async patchAwsSdkInPomForCassandra({ application }) {
        // Add AWS S3 SDK dependency to Cassandra services' pom.xml so the
        // DataStax Astra DB CqlSession bean (in Application.java) can download
        // the secure connect bundle from S3 at startup in production.
        // Only applies to Cassandra services — SQL services don't need it.
        if (!application.applicationTypeMicroservice || !application.databaseTypeCassandra) {
          return;
        }

        this.editFile('pom.xml', content => {
          if (content.includes('aws-java-sdk-s3')) {
            return content;
          }
          return content.replace(
            '    <dependencies>',
            '    <dependencies>\n' +
              '        <!-- AWS S3 SDK for downloading Astra DB secure connect bundle (Cassandra prod) -->\n' +
              '        <dependency>\n' +
              '            <groupId>com.amazonaws</groupId>\n' +
              '            <artifactId>aws-java-sdk-s3</artifactId>\n' +
              '            <version>1.12.762</version>\n' +
              '        </dependency>',
          );
        });
      },

      async patchSpringAiBomInPomForCassandra({ application }) {
        // Spring AI BOM for Cassandra services (orchestrator-owned; base repos are left untouched).
        // The copied cassandra-spring-boot generator adds the spring-ai-openai dependency (for vector
        // entities) and *tries* to add this BOM itself — but in the orchestrator's assembled
        // composition its `</dependencies></dependencyManagement>` anchor can be evaluated before that
        // section is finalized, so the BOM (and thus the version) is dropped and the build fails with
        // "'dependencies.dependency.version' for org.springframework.ai:spring-ai-openai is missing".
        // Add the BOM here, in the orchestrator's POST_WRITING, where the base pom's
        // dependencyManagement already exists. Harmless for non-vector Cassandra services (unused).
        if (!application.applicationTypeMicroservice || !application.databaseTypeCassandra) {
          return;
        }

        this.editFile('pom.xml', content => {
          if (content.includes('spring-ai-bom')) {
            return content;
          }
          return content.replace(
            /(<\/dependencies>\s*<\/dependencyManagement>)/,
            `    <dependency>
                <groupId>org.springframework.ai</groupId>
                <artifactId>spring-ai-bom</artifactId>
                <version>2.0.1</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        $1`,
          );
        });
      },

      async useSaathratriAiBomInPom({ application }) {
        // Saathratri's AI stack is versioned in ONE place, com.saathratri:saathratri-ai-bom (saathratri/saathratri-ai).
        // The base blueprints stay generic (a plain spring-ai-bom import); here, after every step above that adds it,
        // the Spring AI BOM import becomes the Saathratri AI BOM import. See saathratri-ai-bom.js.
        if (!application.applicationTypeMicroservice && !application.applicationTypeGateway) {
          return;
        }
        // ADR-068 (saathratri repo): the service and its saathratri-ai-bom import take the ONE platform version -
        // saathratri-parent's, read from the monorepo at regen time - instead of JHipster's 0.0.1-SNAPSHOT.
        this.editFile('pom.xml', content => usePlatformVersion(useSaathratriAiBom(content), this.saathratriPlatformVersion()));
      },

      async patchCorsInSecurityConfigForMicroservices({ application }) {
        // Enable CORS in Spring Security for microservices. The upstream JHipster
        // template only adds .cors(withDefaults()) for non-microservice apps
        // (gated by `if (!applicationTypeMicroservice)` in SecurityConfiguration_
        // imperative.java.ejs). Saathratri microservices need CORS because the
        // Angular client (jaiashirwaadclient on port 4200) calls microservice APIs
        // directly — without .cors(withDefaults()) the preflight OPTIONS request
        // gets a 401 from Spring Security before the CorsFilter bean (which reads
        // from jhipster.cors) has a chance to add Access-Control-Allow-* headers.
        if (!application.applicationTypeMicroservice) {
          return;
        }

        const packageFolder = application.packageFolder ?? '';
        if (!packageFolder) {
          return;
        }
        const secConfigPath = `src/main/java/${packageFolder}/config/SecurityConfiguration.java`;
        if (!this.existsDestination(secConfigPath)) {
          return;
        }

        this.editFile(secConfigPath, content => {
          if (content.includes('.cors(withDefaults())')) {
            return content;
          }
          return content.replace('            .csrf(csrf -> csrf', '            .cors(withDefaults())\n            .csrf(csrf -> csrf');
        });
      },

      async patchLogbackForDevFileLogging({ application }) {
        // Enable file logging in dev for microservices and the gateway. The upstream
        // JHipster template leaves the FILE appender commented out for microservices,
        // so they only log to the console (visible only in the ttab Terminal tab).
        //
        // Config:
        //   - RollingFileAppender at logs/${baseName}.log
        //   - <append>false</append> — truncated on each service restart
        //   - SizeBasedTriggeringPolicy with maxFileSize=5MB
        //   - FixedWindowRollingPolicy with maxIndex=1 (at most 1 archive)
        //   - Wrapped in AsyncAppender with queueSize=512
        //   - Root logger gets both CONSOLE and ASYNC appender-refs
        //
        // Applies to microservices AND the gateway (Cassandra and Postgres services).
        if (!(application.applicationTypeMicroservice || application.applicationTypeGateway)) {
          return;
        }

        const logbackPath = 'src/main/resources/logback-spring.xml';
        if (!this.existsDestination(logbackPath)) {
          return;
        }

        const { baseName } = application;

        this.editFile(logbackPath, content => {
          // Idempotent: skip if our marker is already present.
          if (content.includes('SAATHRATRI CHANGE: dev file logging')) {
            return content;
          }

          // 1. Add FILE_LOG_PATTERN property right after CONSOLE_LOG_PATTERN.
          const fileLogPatternLine =
            '    <property name="FILE_LOG_PATTERN" value="${FILE_LOG_PATTERN:-%d{${LOG_DATEFORMAT_PATTERN:-yyyy-MM-dd HH:mm:ss.SSS}} ${LOG_LEVEL_PATTERN:-%5p} ${PID:- } --- [%t] %-40.40logger{39} : %crlf(%m) %n${LOG_EXCEPTION_CONVERSION_WORD:-%wEx}}"/>';
          if (!content.includes('FILE_LOG_PATTERN')) {
            content = content.replace(/(<property name="CONSOLE_LOG_PATTERN"[^\n]*\/>)/, `$1\n${fileLogPatternLine}`);
          }

          // 2. Insert the FILE + ASYNC appender block right after the console-appender
          //    include. Using plain string concatenation to keep ${FILE_LOG_PATTERN}
          //    verbatim in the generated XML (logback resolves it at runtime).
          const appenderBlock =
            `\n\n` +
            `    <!-- SAATHRATRI CHANGE: dev file logging -->\n` +
            `    <!-- Rolling file appender: 5 MB max size, 1 archive, truncated on restart -->\n` +
            `    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">\n` +
            `        <file>logs/${baseName}.log</file>\n` +
            `        <append>false</append>\n` +
            `        <rollingPolicy class="ch.qos.logback.core.rolling.FixedWindowRollingPolicy">\n` +
            `            <fileNamePattern>logs/${baseName}.%i.log</fileNamePattern>\n` +
            `            <minIndex>1</minIndex>\n` +
            `            <maxIndex>1</maxIndex>\n` +
            `        </rollingPolicy>\n` +
            `        <triggeringPolicy class="ch.qos.logback.core.rolling.SizeBasedTriggeringPolicy">\n` +
            `            <maxFileSize>5MB</maxFileSize>\n` +
            `        </triggeringPolicy>\n` +
            `        <encoder>\n` +
            `            <charset>utf-8</charset>\n` +
            `            <Pattern>\${FILE_LOG_PATTERN}</Pattern>\n` +
            `        </encoder>\n` +
            `    </appender>\n` +
            `\n` +
            `    <appender name="ASYNC" class="ch.qos.logback.classic.AsyncAppender">\n` +
            `        <queueSize>512</queueSize>\n` +
            `        <appender-ref ref="FILE"/>\n` +
            `    </appender>\n` +
            `    <!-- END SAATHRATRI CHANGE -->`;

          content = content.replace(
            '<include resource="org/springframework/boot/logging/logback/console-appender.xml" />',
            `<include resource="org/springframework/boot/logging/logback/console-appender.xml" />${appenderBlock}`,
          );

          // 3. Add ASYNC appender-ref to the root logger.
          content = content.replace(
            '<root level="${log.level}">\n        <appender-ref ref="CONSOLE" />\n    </root>',
            '<root level="${log.level}">\n        <appender-ref ref="CONSOLE" />\n        <appender-ref ref="ASYNC" />\n    </root>',
          );

          return content;
        });
      },

      async writeDevStartScripts({ application }) {
        // Convenience dev launchers: start.sh (macOS/Linux) + start.bat (Windows) that run the
        // service with Spring Boot's `dev` profile and remote debugging. Written for every
        // generated service (microservices + gateway). Debug port = HTTP serverPort + 10000 so
        // each service gets a unique, predictable address. Lives here (preserved submodule) so it
        // survives the prepare-phase rewrite of the sql-*/cassandra-* subtrees.
        if (!(application.applicationTypeMicroservice || application.applicationTypeGateway)) {
          return;
        }
        const { baseName } = application;
        const httpPort = Number(application.serverPort) || 8080;
        const debugPort = httpPort + 10000;

        const startSh =
          '#!/usr/bin/env bash\n' +
          `# Start ${baseName} in dev mode: Spring Boot 'dev' profile + remote debug on port ${debugPort}.\n` +
          '# Prereqs: infra (Keycloak, JHipster Registry, databases) must already be running.\n' +
          '# Generated by generator-jhipster-orchestrator (spring-boot-orchestrator) - do not edit by hand.\n' +
          'cd "$(dirname "$0")"\n' +
          'exec ./mvnw spring-boot:run \\\n' +
          '  -Dspring-boot.run.profiles=dev \\\n' +
          `  -Dspring-boot.run.jvmArguments="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=${debugPort}"\n`;

        const startBat =
          '@echo off\r\n' +
          `REM Start ${baseName} in dev mode: Spring Boot 'dev' profile + remote debug on port ${debugPort}.\r\n` +
          'REM Prereqs: infra (Keycloak, JHipster Registry, databases) must already be running.\r\n' +
          'REM Generated by generator-jhipster-orchestrator (spring-boot-orchestrator) - do not edit by hand.\r\n' +
          'cd /d "%~dp0"\r\n' +
          `call "%~dp0mvnw.cmd" spring-boot:run -Dspring-boot.run.profiles=dev "-Dspring-boot.run.jvmArguments=-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=${debugPort}"\r\n`;

        this.writeDestination(this.destinationPath('start.sh'), startSh);
        this.writeDestination(this.destinationPath('start.bat'), startBat);
        this.log.ok(`[spring-boot-orchestrator] Wrote start.sh / start.bat (debug ${debugPort}) for ${baseName}`);
      },
    });
  }

  get [BaseApplicationGenerator.POST_WRITING_ENTITIES]() {
    return this.asPostWritingEntitiesTaskGroup({
      async copyDtosToSeparateModule({ application, entities }) {
        // Copy each entity's DTO file to a separate ${baseName}dto/ Maven module so it
        // can be packaged as a shared JAR for use by the orchestrator and other consumers.
        //
        // Why this lives here instead of in the upstream cassandra/SQL sub-generators:
        // historically the orchestrator's prepare phase used sed-style needle replacements
        // to inject `renameTo` callbacks into the upstream sub-generators' templates lists,
        // but that approach was brittle. The prepare phase rewrites generator source code
        // every regen, and any drift between upstream needle markers and the prepare
        // patterns silently turns the replacement into a no-op — at which point the
        // affected services start shipping empty dto/ Maven modules with no warning.
        //
        // (Note: do NOT mention the upstream package names or needle markers literally in
        // this file. The prepare phase also rewrites package refs and needle markers across
        // every generator.js, so any literal occurrence in a comment will get clobbered or,
        // worse, sed will inject a code fragment into the middle of this comment and break
        // the file's syntax. Ask me how I know.)
        //
        // Doing the copy here in POST_WRITING_ENTITIES means:
        //   - It lives in version control next to the rest of the orchestrator code.
        //   - It runs against any future upstream changes without depending on needle
        //     markers we don't control.
        //   - It works for SQL and Cassandra in the same place.
        //
        // We don't bother re-implementing the per-database "should this entity have a DTO?"
        // conditions — we just attempt to read the expected DTO files from the in-memory
        // store, and skip whichever ones weren't generated upstream (e.g., SQL entities
        // without `dto mapstruct`, or single-key Cassandra entities without a composite-key
        // Id class). The file system is the source of truth.

        // Skip the gateway — it forwards entity API calls to microservices and doesn't
        // have its own dto module to populate.
        if (!application.applicationTypeMicroservice) {
          return;
        }

        const packageFolder = (application.packageFolder ?? '').replace(/\/+$/, '');
        if (!packageFolder) {
          this.log.warn('[spring-boot-orchestrator] POST_WRITING_ENTITIES: packageFolder unavailable, skipping DTO module copy');
          return;
        }

        const dtoModuleDtoDir = `../${application.baseName}dto/src/main/java/${packageFolder}/service/dto`;
        const tryCopy = (relSrc, relDest) => {
          let content;
          try {
            const buf = this.readDestination(this.destinationPath(relSrc));
            content = buf?.toString();
          } catch {
            // file does not exist in the in-memory store — skip it
            return false;
          }
          if (typeof content !== 'string' || content.length === 0) {
            return false;
          }
          this.writeDestination(this.destinationPath(relDest), content);
          return true;
        };

        let copied = 0;
        for (const entity of entities) {
          if (entity.builtIn || entity.skipServer || !entity.dtoClass) {
            continue;
          }

          // ${dtoClass}.java — generated for SQL entities with `dto mapstruct` and for
          // every Cassandra entity.
          if (tryCopy(`src/main/java/${packageFolder}/service/dto/${entity.dtoClass}.java`, `${dtoModuleDtoDir}/${entity.dtoClass}.java`)) {
            copied += 1;
          }

          // ${dtoClass}Id.java — generated only for Cassandra composite-key entities.
          if (
            tryCopy(`src/main/java/${packageFolder}/service/dto/${entity.dtoClass}Id.java`, `${dtoModuleDtoDir}/${entity.dtoClass}Id.java`)
          ) {
            copied += 1;
          }
        }

        if (copied > 0) {
          this.log.ok(`[spring-boot-orchestrator] Copied ${copied} DTO file(s) to ${application.baseName}dto module`);
        }

        // Write a .gitignore to the DTO module root so target/ build artifacts
        // are never committed. The DTO module is a plain Maven JAR with no
        // JHipster .gitignore template, so without this the target/ directory
        // leaks into git after the first `mvn install`.
        const gitignorePath = `../${application.baseName}dto/.gitignore`;
        const gitignoreContent = ['/target/', '!.mvn/wrapper/maven-wrapper.jar', ''].join('\n');
        this.writeDestination(this.destinationPath(gitignorePath), gitignoreContent);
        this.log.ok(`[spring-boot-orchestrator] Wrote ${gitignorePath}`);
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
   * The ONE Saathratri platform version (saathratri ADR-068): saathratri-parent's own version, read from the monorepo
   * at regen time; undefined (with a warning) when there is no parent pom beside this app.
   */
  saathratriPlatformVersion() {
    const parentPom = this.destinationPath('../saathratri-parent/pom.xml');
    const version = fs.existsSync(parentPom) ? platformVersionOf(fs.readFileSync(parentPom, 'utf8')) : undefined;
    if (!version) {
      this.log.warn(`[saathratri] no saathratri-parent version found at ${parentPom} - keeping the generated version`);
    }
    return version;
  }
}
