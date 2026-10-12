/*
 * Copyright (c) 2025-2026 Saathratri, LLC.
 * SPDX-License-Identifier: MIT
 * Licensed under the MIT License; see LICENSE in the repository root.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { defaultHelpers as helpers, result } from 'generator-jhipster/testing';

// A field marked @sensitive in the JDL arrives as options.sensitive === true; @sensitive(writeOnly) as 'writeOnly'.
// Every field of this blueprint carries its four @customAnnotation values (key type, Cassandra type, date format, order).
const TEXT = ['', 'CassandraType.Name.TEXT', '', ''];
const column = (fieldName, fieldType, options = {}, extra = {}) => ({
  fieldName,
  fieldType,
  options: { customAnnotation: fieldType === 'Integer' ? ['', 'CassandraType.Name.INT', '', ''] : TEXT, ...options },
  ...extra,
});
const vault = (fields, extra = {}) => ({
  name: 'Vault',
  changelogDate: '20200101000100',
  dto: 'mapstruct',
  service: 'serviceImpl',
  pagination: 'pagination',
  fields: [
    {
      fieldName: 'id',
      fieldType: 'UUID',
      options: { id: true, customAnnotation: ['PrimaryKeyType.PARTITIONED', 'CassandraType.Name.UUID', '', ''] },
    },
    ...fields,
  ],
  relationships: [],
  ...extra,
});

const VAULT_FIELDS = [
  column('label', 'String'),
  column('apiKey', 'String', { sensitive: true }),
  column('secretHash', 'String', { sensitive: 'writeOnly' }),
];

const runServer = entities =>
  helpers
    .runJHipster('server')
    .withJHipsterConfig({ databaseType: 'cassandra', prodDatabaseType: 'cassandra', devDatabaseType: 'cassandra' }, entities)
    .withOptions({ ignoreNeedlesError: true })
    .withJHipsterGenerators()
    .withConfiguredBlueprint()
    .withBlueprintConfig();

// The run's error message, or undefined when the run succeeded (a resolved run cannot be pretty-printed by expect).
const refusal = run =>
  run.then(
    () => undefined,
    error => error.message,
  );

const JAVA = 'src/main/java/com/mycompany/myapp';
const TEST = 'src/test/java/com/mycompany/myapp';

describe('@sensitive fields (cassandra-spring-boot)', () => {
  describe('an entity with a sensitive field and a write-only field', () => {
    beforeAll(async () => {
      await runServer([vault(VAULT_FIELDS)]);
    });

    it('the entity prints set / missing for a sensitive field, never its value', () => {
      const file = `${JAVA}/domain/Vault.java`;
      result.assertFileContent(file, `", apiKey=" + (getApiKey() == null ? "missing" : "set") +`);
      result.assertFileContent(file, `", secretHash=" + (getSecretHash() == null ? "missing" : "set") +`);
      result.assertNoFileContent(file, `apiKey='" + getApiKey()`);
      result.assertFileContent(file, `", label='" + getLabel() + "'" +`);
    });

    it('the DTO prints set / missing for a sensitive field, never its value', () => {
      const file = `${JAVA}/service/dto/VaultDTO.java`;
      result.assertFileContent(file, `", apiKey=" + (getApiKey() == null ? "missing" : "set") +`);
      result.assertFileContent(file, `", secretHash=" + (getSecretHash() == null ? "missing" : "set") +`);
      result.assertNoFileContent(file, `apiKey='" + getApiKey()`);
    });

    it('a write-only field is accepted on input and never serialized; the DTO says only whether it is set', () => {
      const file = `${JAVA}/service/dto/VaultDTO.java`;
      result.assertFileContent(file, 'import com.fasterxml.jackson.annotation.JsonProperty;');
      result.assertFileContent(file, /@JsonProperty\(access = JsonProperty\.Access\.WRITE_ONLY\)\s+private String secretHash;/);
      result.assertNoFileContent(file, /@JsonProperty\(access = JsonProperty\.Access\.WRITE_ONLY\)\s+private String apiKey;/);
      result.assertFileContent(file, '@JsonProperty(value = "secretHashIsSet", access = JsonProperty.Access.READ_ONLY)');
      result.assertFileContent(file, /public boolean secretHashIsSet\(\) \{\s+return secretHash != null && !secretHash\.isEmpty\(\);/);
    });

    it('an update that leaves a write-only field empty keeps the stored value', () => {
      const file = `${JAVA}/service/impl/VaultServiceImpl.java`;
      result.assertFileContent(file, 'keepStoredWriteOnlyFields(vault, vaultDTO);');
      result.assertFileContent(
        file,
        /if \(vaultDTO\.getSecretHash\(\) == null \|\| vaultDTO\.getSecretHash\(\)\.isEmpty\(\)\) \{\s+vaultRepository\.findById\(vault\.getId\(\)\)\.map\(Vault::getSecretHash\)\.ifPresent\(vault::setSecretHash\);/,
      );
    });

    it('the generated IT proves no sensitive value reaches a log line, at DEBUG', () => {
      const file = `${TEST}/web/rest/VaultResourceIT.java`;
      result.assertFileContent(file, 'void sensitiveFieldsNeverReachTheLog() throws Exception {');
      result.assertFileContent(file, 'app.setLevel(Level.DEBUG);');
      // an entity named Org would shadow the org. package prefix in its own IT
      result.assertFileContent(file, 'LoggerFactory.getLogger(ch.qos.logback.classic.Logger.ROOT_LOGGER_NAME)');
      result.assertFileContent(
        file,
        /for \(String secret : List\.of\(DEFAULT_API_KEY, UPDATED_API_KEY, DEFAULT_SECRET_HASH, UPDATED_SECRET_HASH\)\)/,
      );
    });

    it('the generated IT proves a write-only field is never returned and an update without it keeps it', () => {
      const file = `${TEST}/web/rest/VaultResourceIT.java`;
      result.assertFileContent(file, '.andExpect(jsonPath("$.secretHash").doesNotExist())');
      result.assertFileContent(file, '.andExpect(jsonPath("$.[*].secretHash").doesNotExist())');
      result.assertFileContent(file, '.andExpect(jsonPath("$.secretHashIsSet").value(true))');
      result.assertFileContent(file, 'void updateWithoutWriteOnlyFieldsKeepsStoredValues() throws Exception {');
      result.assertNoFileContent(file, 'jsonPath("$.secretHash").value(');
      result.assertFileContent(file, 'private byte[] bodyWithWriteOnlyFields(Object value) {');
      result.assertNoFileContent(file, 'om.writeValueAsBytes(vaultDTO)');
    });
  });

  describe('refuses what it cannot keep secret', () => {
    it('a write-only field that is required (an update never carries it)', async () => {
      expect(
        await refusal(
          runServer([vault([column('secretHash', 'String', { sensitive: 'writeOnly' }, { fieldValidateRules: ['required'] })])]),
        ),
      ).toMatch(/Vault\.secretHash.*write-only.*required/);
    });

    it('a sensitive field that is not a String or TextBlob', async () => {
      expect(await refusal(runServer([vault([column('pin', 'Integer', { sensitive: true })])]))).toMatch(/Vault\.pin.*String or TextBlob/);
    });
  });
});
