import { fileURLToPath } from 'node:url';
import { vi } from 'vitest';
import { defineDefaults } from 'generator-jhipster/testing';

defineDefaults({
  mockFactory: () => vi.fn(),
  blueprint: 'generator-jhipster-orchestrator',
  blueprintPackagePath: fileURLToPath(new URL('./', import.meta.url)),
});
