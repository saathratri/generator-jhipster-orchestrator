/*
 * Copyright (c) 2026 Saathratri, LLC. All rights reserved.
 * SPDX-License-Identifier: LicenseRef-Saathratri-Proprietary
 * Proprietary and confidential - see LICENSE in the repository root.
 */

import { defineConfig, defaultExclude } from 'vitest/config';

export default defineConfig({
  test: {
    pool: 'forks',
    hookTimeout: 20000,
    exclude: [...defaultExclude.filter(val => val !== '**/cypress/**'), '**/templates/**', '**/resources/**'],
    setupFiles: ['./vitest.test-setup.ts'],
  },
});
