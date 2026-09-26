import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';


// The REAL template this blueprint writes for every generated service's config/application.yml.
const TEMPLATE = readFileSync(fileURLToPath(new URL('./templates/src/main/resources/config/application.yml.ejs', import.meta.url)), 'utf8');

describe("the gateway's discovery-locator route predicate", () => {
  // Spring Cloud Gateway 2025.1 (Spring Cloud 2025.1.3, JHipster 9.4) evaluates the discovery locator's predicate
  // expressions in a restricted SpEL context: a METHOD CALL there - serviceId.toLowerCase() - fails with
  // "EL1004E: Method call: Method toLowerCase() cannot be found on type java.lang.String" and the gateway dies at
  // startup (production, saathratri-gateway v407, 2026-09-26 - rolled back to v406). lower-case-service-id: true
  // already lowercases serviceId; upstream JHipster 9.4 dropped the call for exactly this reason.
  const pattern = TEMPLATE.split('\n').find(line => line.includes("'/services/'+serviceId"));

  it('is present', () => {
    expect(pattern).toBeDefined();
  });

  it('calls no method in its SpEL expression (the restricted context forbids it)', () => {
    expect(pattern).not.toMatch(/serviceId\.[A-Za-z]+\(/);
    expect(pattern.trim()).toBe(`pattern: "'/services/'+serviceId+'/**'"`);
  });

  it('keeps lower-case-service-id, which does the lowercasing instead', () => {
    expect(TEMPLATE).toMatch(/lower-case-service-id: true/);
  });
});
