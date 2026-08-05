/*
 * Copyright (c) 2026 Saathratri, LLC. All rights reserved.
 * SPDX-License-Identifier: LicenseRef-Saathratri-Proprietary
 * Proprietary and confidential - see LICENSE in the repository root.
 */

import { fileURLToPath } from 'node:url';
import { vi } from 'vitest';
import { defineDefaults } from 'generator-jhipster/testing';

defineDefaults({
  mockFactory: () => vi.fn(),
  blueprint: 'generator-jhipster-orchestrator',
  blueprintPackagePath: fileURLToPath(new URL('./', import.meta.url)),
});
