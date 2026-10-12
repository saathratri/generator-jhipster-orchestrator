/*
 * Copyright (c) 2023-2026 Saathratri, LLC.
 * SPDX-License-Identifier: MIT
 * Licensed under the MIT License; see LICENSE in the repository root.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { defaultHelpers as helpers, result } from 'generator-jhipster/testing';

// A field marked @sensitive in the JDL arrives as options.sensitive === true; @sensitive(writeOnly) as 'writeOnly'.
const vault = (fields, extra = {}) => ({
  name: 'Vault',
  changelogDate: '20200101000100',
  jpaMetamodelFiltering: true,
  dto: 'mapstruct',
  service: 'serviceImpl',
  pagination: 'pagination',
  fields,
  relationships: [],
  ...extra,
});

const VAULT_FIELDS = [
  { fieldName: 'label', fieldType: 'String' },
  { fieldName: 'apiKey', fieldType: 'String', options: { sensitive: true } },
  {
    fieldName: 'secretHash',
    fieldType: 'String',
    fieldValidateRules: ['maxlength'],
    fieldValidateRulesMaxlength: 128,
    options: { sensitive: 'writeOnly' },
  },
];

// Owner links to Vault, whose label is the link's display field and whose apiKey carries @sensitive and nothing else.
const LINKED_ENTITIES = [
  vault([
    { fieldName: 'label', fieldType: 'String', options: { customAnnotation: ['DISPLAY_IN_GUI_RELATIONSHIP_LINK', ''] } },
    { fieldName: 'apiKey', fieldType: 'String', options: { sensitive: true } },
  ]),
  {
    name: 'Owner',
    changelogDate: '20200101000200',
    dto: 'mapstruct',
    service: 'serviceImpl',
    fields: [{ fieldName: 'name', fieldType: 'String' }],
    relationships: [
      {
        relationshipName: 'vault',
        otherEntityName: 'vault',
        otherEntityField: 'label',
        relationshipSide: 'left',
        relationshipType: 'many-to-one',
      },
    ],
  },
];

// As LINKED_ENTITIES, but Vault's apiKey is @sensitive AND a link field - listed first, so nothing can pick it as "the" label
// by position.
const LINKED_SENSITIVE_LABEL_ENTITIES = [
  vault([
    { fieldName: 'apiKey', fieldType: 'String', options: { sensitive: true, customAnnotation: ['DISPLAY_IN_GUI_RELATIONSHIP_LINK', ''] } },
    { fieldName: 'label', fieldType: 'String', options: { customAnnotation: ['DISPLAY_IN_GUI_RELATIONSHIP_LINK', ''] } },
  ]),
  LINKED_ENTITIES[1],
];

const runServer = entities =>
  helpers
    .runJHipster('server')
    .withJHipsterConfig({}, entities)
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

describe('@sensitive fields (sql-spring-boot)', () => {
  describe('an entity with a sensitive field and a write-only field', () => {
    beforeAll(async () => {
      await runServer([vault(VAULT_FIELDS)]);
    });

    it('the entity prints set / missing for a sensitive field, never its value', () => {
      const file = `${JAVA}/domain/Vault.java`;
      result.assertFileContent(file, `", apiKey=" + (getApiKey() == null ? "missing" : "set") +`);
      result.assertFileContent(file, `", secretHash=" + (getSecretHash() == null ? "missing" : "set") +`);
      result.assertNoFileContent(file, `apiKey='" + getApiKey()`);
      result.assertNoFileContent(file, `secretHash='" + getSecretHash()`);
      result.assertFileContent(file, `", label='" + getLabel() + "'" +`);
    });

    it('the DTO prints set / missing for a sensitive field, never its value', () => {
      const file = `${JAVA}/service/dto/VaultDTO.java`;
      result.assertFileContent(file, `", apiKey=" + (getApiKey() == null ? "missing" : "set") +`);
      result.assertFileContent(file, `", secretHash=" + (getSecretHash() == null ? "missing" : "set") +`);
      result.assertNoFileContent(file, `apiKey='" + getApiKey()`);
      result.assertNoFileContent(file, `secretHash='" + getSecretHash()`);
    });

    it('a write-only field is accepted on input and never serialized; the DTO says only whether it is set', () => {
      const file = `${JAVA}/service/dto/VaultDTO.java`;
      result.assertFileContent(file, 'import com.fasterxml.jackson.annotation.JsonProperty;');
      result.assertFileContent(file, /@JsonProperty\(access = JsonProperty\.Access\.WRITE_ONLY\)\s+private String secretHash;/);
      result.assertNoFileContent(file, /@JsonProperty\(access = JsonProperty\.Access\.WRITE_ONLY\)\s+private String apiKey;/);
      result.assertFileContent(file, '@JsonProperty(value = "secretHashIsSet", access = JsonProperty.Access.READ_ONLY)');
      result.assertFileContent(file, /public boolean secretHashIsSet\(\) \{\s+return secretHash != null && !secretHash\.isEmpty\(\);/);
    });

    it('a sensitive field cannot be filtered on (a filter value lands in URLs and logs)', () => {
      const file = `${JAVA}/service/criteria/VaultCriteria.java`;
      result.assertFileContent(file, 'private StringFilter label;');
      result.assertNoFileContent(file, 'apiKey');
      result.assertNoFileContent(file, 'secretHash');
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
      result.assertNoFileContent(file, '"secretHash.equals="');
      result.assertNoFileContent(file, '"apiKey.equals="');
      result.assertNoFileContent(file, 'getAllVaultsByApiKeyContainsSomething');
      result.assertNoFileContent(file, 'getAllVaultsBySecretHashNotContainsSomething');
    });

    it('the generated IT sends write-only fields itself (Jackson leaves them out of a serialized DTO)', () => {
      const file = `${TEST}/web/rest/VaultResourceIT.java`;
      result.assertFileContent(file, 'private byte[] bodyWithWriteOnlyFields(Object value) {');
      result.assertNoFileContent(file, 'om.writeValueAsBytes(vaultDTO)');
    });
  });

  describe('a sensitive TextBlob', () => {
    beforeAll(async () => {
      await runServer([vault([{ fieldName: 'note', fieldType: 'TextBlob', options: { sensitive: true } }])]);
    });

    it('is accepted and printed as set / missing', () => {
      result.assertFileContent(`${JAVA}/service/dto/VaultDTO.java`, `", note=" + (getNote() == null ? "missing" : "set") +`);
      result.assertFileContent(`${JAVA}/domain/Vault.java`, `", note=" + (getNote() == null ? "missing" : "set") +`);
    });
  });

  describe('an entity linked to an entity whose only option on a field is @sensitive', () => {
    // The linking entity's mapper reads the linked entity's fields for its display label; a field with options but no
    // @customAnnotation must not stop the run.
    let error;
    beforeAll(async () => {
      error = await refusal(runServer(LINKED_ENTITIES));
    });

    it('generates', () => {
      expect(error).toBeUndefined();
    });

    it("the linking entity's mapper carries the linked display field, never the sensitive one", () => {
      const file = `${JAVA}/service/mapper/OwnerMapper.java`;
      result.assertFileContent(file, '@Mapping(target = "label", source = "label")');
      result.assertNoFileContent(file, '"apiKey"');
    });
  });

  describe('a @sensitive field that is also a link field', () => {
    // DISPLAY_IN_GUI_RELATIONSHIP_LINK decides what a linking entity's mapper copies into its embedded copy of the
    // linked entity. A @sensitive value may be returned (only a write-only one never is), so it keeps travelling with the
    // linking entity - readers of that response need it - while the screens never use it as a label.
    let error;
    beforeAll(async () => {
      error = await refusal(runServer(LINKED_SENSITIVE_LABEL_ENTITIES));
    });

    it('generates', () => {
      expect(error).toBeUndefined();
    });

    it("the linking entity's mapper still copies the sensitive value into its embedded copy", () => {
      const file = `${JAVA}/service/mapper/OwnerMapper.java`;
      result.assertFileContent(file, '@Mapping(target = "label", source = "label")');
      result.assertFileContent(file, '@Mapping(target = "apiKey", source = "apiKey")');
    });

    it('the linked entity still prints the sensitive value as set / missing', () => {
      result.assertFileContent(`${JAVA}/service/dto/VaultDTO.java`, `", apiKey=" + (getApiKey() == null ? "missing" : "set") +`);
    });
  });

  describe('refuses what it cannot keep secret', () => {
    it('a write-only field that is required (an update never carries it)', async () => {
      expect(
        await refusal(
          runServer([
            vault([
              { fieldName: 'secretHash', fieldType: 'String', fieldValidateRules: ['required'], options: { sensitive: 'writeOnly' } },
            ]),
          ]),
        ),
      ).toMatch(/Vault\.secretHash.*write-only.*required/);
    });

    it('a write-only field that is a link field (a linking entity would need a value it is never given)', async () => {
      expect(
        await refusal(
          runServer([
            vault([
              {
                fieldName: 'secretHash',
                fieldType: 'String',
                options: { sensitive: 'writeOnly', customAnnotation: ['DISPLAY_IN_GUI_RELATIONSHIP_LINK', ''] },
              },
            ]),
          ]),
        ),
      ).toMatch(/Vault\.secretHash.*DISPLAY_IN_GUI_RELATIONSHIP_LINK/);
    });

    it('a write-only field on an entity without a mapstruct DTO', async () => {
      expect(
        await refusal(
          runServer([vault([{ fieldName: 'secretHash', fieldType: 'String', options: { sensitive: 'writeOnly' } }], { dto: 'no' })]),
        ),
      ).toMatch(/Vault\.secretHash.*write-only.*dto mapstruct/);
    });

    it('a sensitive field that is not a String or TextBlob', async () => {
      expect(await refusal(runServer([vault([{ fieldName: 'pin', fieldType: 'Integer', options: { sensitive: true } }])]))).toMatch(
        /Vault\.pin.*String or TextBlob/,
      );
    });

    it('an unknown @sensitive value', async () => {
      expect(await refusal(runServer([vault([{ fieldName: 'apiKey', fieldType: 'String', options: { sensitive: 'hidden' } }])]))).toMatch(
        /Vault\.apiKey.*@sensitive\("hidden"\)/,
      );
    });
  });
});
