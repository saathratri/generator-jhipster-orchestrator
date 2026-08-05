/*
 * Copyright (c) 2026 Saathratri, LLC.
 * SPDX-License-Identifier: MIT
 * Licensed under the MIT License; see LICENSE in the repository root.
 */

export const herokuSaathratriUtils = {
  /**************************************
   * heroku-orchestrator-utils Helper Functions
   **************************************/
  getMicroserviceName(baseName) {
    let serviceName = '';

    const endIndexOfServiceName = baseName.indexOf('service');

    if (endIndexOfServiceName >= 0) {
      const endIndexOfSaathratriName = baseName.indexOf('saathratri');

      if (endIndexOfSaathratriName >= 0) {
        serviceName = `saathratri-${baseName.substring(10, endIndexOfServiceName)}-service`;
      } else {
        serviceName = `${baseName.substring(0, endIndexOfServiceName)}-service`;
      }
    } else {
      serviceName = `${baseName}-service`;
    }

    return serviceName;
  },
};
