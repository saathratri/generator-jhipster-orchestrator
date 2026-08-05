/*
 * Copyright (c) 2026 Saathratri, LLC. All rights reserved.
 * SPDX-License-Identifier: LicenseRef-Saathratri-Proprietary
 * Proprietary and confidential - see LICENSE in the repository root.
 */

import globals from 'globals';
import jhipster from 'generator-jhipster/eslint';

export default [
  { ignores: ['coverage/**'] },
  jhipster.recommended,
  {
    // The blueprint's generator/cli code is plain Node.js (.js/.cjs); ensure Node
    // globals (module, require, __dirname, process, console, URL, ...) are recognized.
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
