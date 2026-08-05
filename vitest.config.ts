/*
 * Copyright (c) 2026 Saathratri, LLC.
 * SPDX-License-Identifier: MIT
 * Licensed under the MIT License; see LICENSE in the repository root.
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
