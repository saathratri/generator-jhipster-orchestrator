#!/usr/bin/env node
/*
 * Copyright (c) 2026 Saathratri, LLC.
 * SPDX-License-Identifier: MIT
 * Licensed under the MIT License; see LICENSE in the repository root.
 */


const { basename, dirname, join } = require('path');

const { bin, version } = require('../package.json');

// Get package name to use as namespace.
// Allows blueprints to be aliased.
const packagePath = dirname(__dirname);
const packageFolderName = basename(packagePath);
const devBlueprintPath = join(packagePath, '.blueprint');
const blueprint = packageFolderName.startsWith('jhipster-') ? `generator-${packageFolderName}` : packageFolderName;

(async () => {
  const { runJHipster, done, logger } = await import('generator-jhipster/cli');
  const executableName = Object.keys(bin)[0];

  runJHipster({
    executableName,
    executableVersion: version,
    defaultCommand: 'app',
    devBlueprintPath,
    blueprints: {
      [blueprint]: version,
    },
    printBlueprintLogo: () => {
      console.log('===================== JHipster orchestrator =====================');
      console.log('');
    },
    lookups: [{ packagePaths: [packagePath] }],
  }).catch(done);

  process.on('unhandledRejection', up => {
    logger.error('Unhandled promise rejection at:');
    logger.fatal(up);
  });
})();
