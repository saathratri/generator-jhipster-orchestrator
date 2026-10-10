/**
 * Strips relationships excluded from an entity's update form (@customQueryAnnotation exclude[...]) out of the two
 * upstream specs that test that form. The generator already strips them from `-update.ts` and `-form.service.ts`;
 * left in the specs, they referenced members the component no longer has, so `-update.spec.ts` did not compile and
 * the form-service spec expected controls that do not exist (pre-existing at JHipster 9.2).
 *
 * Statements are removed by bracket balance, not by line shape, so the result does not depend on how the raw
 * template output is wrapped before prettier runs.
 */

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Removes every statement whose first line matches `startRe` (anchored at the line's indentation): from the start of
 * that line to the `;` that closes the statement at bracket depth 0, plus the line break after it.
 */
function removeStatements(content, startRe) {
  const re = new RegExp(`^[ \\t]*${startRe.source}`, 'm');
  let out = content;
  for (let guard = 0; guard < 1000; guard++) {
    const m = re.exec(out);
    if (!m) break;
    const start = m.index;
    let depth = 0;
    let quote = null;
    let end = -1;
    for (let i = start; i < out.length; i++) {
      const ch = out[i];
      if (quote) {
        if (ch === '\\') i++;
        else if (ch === quote) quote = null;
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') quote = ch;
      else if (ch === '(' || ch === '[' || ch === '{') depth++;
      else if (ch === ')' || ch === ']' || ch === '}') depth--;
      else if (ch === ';' && depth === 0) {
        end = i + 1;
        break;
      }
    }
    if (end < 0) break;
    if (out[end] === '\r') end++;
    if (out[end] === '\n') end++;
    out = out.slice(0, start) + out.slice(end);
  }
  return out;
}

/**
 * @param {string} content the generated `-update.spec.ts`
 * @param {{ entityInstance: string, rels: Array<{ otherEntityAngularName: string, otherEntityInstancePlural: string,
 *   propertyName: string, relationshipFieldName: string }> }} options
 */
export function stripExcludedFromUpdateSpec(content, { entityInstance, rels }) {
  let out = content;
  for (const rel of rels) {
    const ea = escapeRe(rel.otherEntityAngularName);
    const eip = escapeRe(rel.otherEntityInstancePlural);
    const svc = escapeRe(`${rel.otherEntityAngularName.charAt(0).toLowerCase()}${rel.otherEntityAngularName.slice(1)}Service`);
    const pn = escapeRe(rel.propertyName);
    const rf = escapeRe(rel.relationshipFieldName);
    const ei = escapeRe(entityInstance);
    // Whole blocks first, so the statements inside them go with them.
    out = removeStatements(out, new RegExp(`it\\(\\s*'should call ${ea} query and add missing value'`));
    out = removeStatements(out, new RegExp(`describe\\(\\s*'compare${ea}'`));
    // The 'should update editForm' test's lines for this relationship.
    out = removeStatements(out, new RegExp(`const ${rf}: I${ea}\\b`));
    out = removeStatements(out, new RegExp(`${ei}\\.${pn} = `));
    out = removeStatements(out, new RegExp(`expect\\(comp\\.${eip}SharedCollection\\(\\)\\)`));
    // Service wiring and imports.
    out = removeStatements(out, new RegExp(`let ${svc}: ${ea}Service;`));
    out = removeStatements(out, new RegExp(`${svc} = TestBed\\.inject\\(${ea}Service\\)`));
    out = removeStatements(out, new RegExp(`import \\{ I${ea} \\} from `));
    out = removeStatements(out, new RegExp(`import \\{ ${ea}Service \\} from `));
  }
  return out;
}

/**
 * @param {string} content the generated `-form.service.spec.ts`
 * @param {string[]} propertyNames the excluded relationships' form-control names
 */
export function stripExcludedFromFormServiceSpec(content, propertyNames) {
  let out = content;
  for (const pn of propertyNames) {
    out = out.replace(new RegExp(`^[ \\t]*${escapeRe(pn)}: expect\\.any\\(Object\\),?[ \\t]*\\r?\\n`, 'gm'), '');
  }
  return out;
}
