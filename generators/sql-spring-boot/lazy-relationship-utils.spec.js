/*
 * Copyright (c) 2023-2026 Saathratri, LLC.
 * SPDX-License-Identifier: MIT
 * Licensed under the MIT License; see LICENSE in the repository root.
 */

import { describe, expect, it } from 'vitest';

import { getDisplayLabelField, isDisplayInGuiLinkField } from './lazy-relationship-utils.js';

const link = (fieldName, extra = {}) => ({ fieldName, options: { customAnnotation: ['DISPLAY_IN_GUI_RELATIONSHIP_LINK', ''], ...extra } });

describe('lazy-relationship-utils', () => {
  it('a field with options but no @customAnnotation is not a link field', () => {
    expect(isDisplayInGuiLinkField({ fieldName: 'apiKey', options: { sensitive: true } })).toBe(false);
    expect(isDisplayInGuiLinkField(link('name'))).toBe(true);
  });

  it('the label field is never a @sensitive one - a search filter or label would carry its value', () => {
    expect(getDisplayLabelField({ fields: [link('apiKey', { sensitive: true }), link('label')] })).toBe('label');
    expect(getDisplayLabelField({ fields: [link('secret', { sensitive: 'writeOnly' })] })).toBeNull();
  });
});
