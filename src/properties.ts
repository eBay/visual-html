const LOGICAL_PROPERTY = /(^|-)(inline|block)(-|$)/;
const NONE: string[] = [];
const logicalNamesByFlow = new Map<string, Map<string, string>>();
let shorthandNames: ShorthandNames | undefined;

interface ShorthandNames {
  byLonghand: Map<string, string[]>;
  byShorthand: Map<string, string[]>;
}

/**
 * Properties an element takes from its parent when it declares nothing, so
 * declaring one at its default value is not the no-op it is for the rest.
 */
export const INHERITED_PROPERTIES = new Set([
  "border-collapse",
  "border-spacing",
  "caption-side",
  "caret-color",
  "color",
  "color-scheme",
  "cursor",
  "direction",
  "empty-cells",
  "font-family",
  "font-feature-settings",
  "font-kerning",
  "font-optical-sizing",
  "font-size",
  "font-size-adjust",
  "font-stretch",
  "font-style",
  "font-variant",
  "font-variant-caps",
  "font-variant-east-asian",
  "font-variant-ligatures",
  "font-variant-numeric",
  "font-variation-settings",
  "font-weight",
  "hyphens",
  "image-rendering",
  "letter-spacing",
  "line-height",
  "list-style-image",
  "list-style-position",
  "list-style-type",
  "orphans",
  "overflow-wrap",
  "paint-order",
  "pointer-events",
  "print-color-adjust",
  "quotes",
  "ruby-align",
  "ruby-position",
  "scrollbar-color",
  "tab-size",
  "text-align",
  "text-align-last",
  "text-anchor",
  "text-indent",
  "text-justify",
  "text-rendering",
  "text-shadow",
  "text-size-adjust",
  "text-transform",
  "text-underline-offset",
  "text-underline-position",
  "text-wrap",
  "visibility",
  "white-space",
  "white-space-collapse",
  "widows",
  "word-break",
  "word-spacing",
  "writing-mode",
]);

/**
 * Given a longhand, returns the shorthands that write it, most specific first.
 * A shorthand written with a var() cannot be split until substitution, so its
 * longhands enumerate with no value and only the shorthand carries one.
 */
export function getShorthandsFor(doc: Document, longhand: string) {
  return getShorthandNames(doc).byLonghand.get(longhand) || NONE;
}

/**
 * Given a declared property, returns the properties it writes under the names
 * the cascade settles them by: a shorthand writes each of its longhands, and a
 * logical property writes the physical one it resolves to for the element.
 */
export function getWrittenProperties(el: Element, name: string) {
  const doc = el.ownerDocument!;
  const written = getShorthandNames(doc).byShorthand.get(name) || [name];

  if (!written.some(isLogical)) {
    return written;
  }
  const logicalNames = getLogicalNames(el);

  return written.map((property) => logicalNames.get(property) || property);
}

function isLogical(name: string) {
  return LOGICAL_PROPERTY.test(name);
}

function getLogicalNames(el: Element) {
  const doc = el.ownerDocument!;
  const { direction, writingMode } = doc.defaultView!.getComputedStyle(el);
  const flow = `${direction}|${writingMode}`;
  let names = logicalNamesByFlow.get(flow);

  if (!names) {
    logicalNamesByFlow.set(
      flow,
      (names = buildLogicalNames(doc, direction, writingMode))
    );
  }

  return names;
}

function getShorthandNames(doc: Document) {
  return (shorthandNames = shorthandNames || buildShorthandNames(doc));
}

/**
 * Reads the names from a style declaration rather than a list of our own, so
 * whatever the browser supports is covered: setting a property to a css wide
 * keyword expands it into the longhands it writes.
 */
function buildShorthandNames(doc: Document): ShorthandNames {
  const scratch = doc.createElement("div").style;
  const expansions: Array<[string, string[]]> = [];

  for (const idlName in scratch) {
    const name = idlName
      .replace(/^webkit/, "Webkit")
      .replace(/[A-Z]/g, (letter) => "-" + letter.toLowerCase());
    scratch.cssText = "";
    try {
      scratch.setProperty(name, "inherit");
    } catch {
      continue;
    }
    const longhands = Array.from(scratch);
    if (
      longhands.length > 1 ||
      (longhands.length === 1 && longhands[0] !== name)
    ) {
      expansions.push([name, longhands]);
    }
  }

  // Fewer longhands means a more specific shorthand; `all` is the worst.
  expansions.sort((a, b) => a[1].length - b[1].length);
  const byLonghand = new Map<string, string[]>();
  for (const [shorthand, longhands] of expansions) {
    for (const longhand of longhands) {
      const found = byLonghand.get(longhand);
      if (found) {
        found.push(shorthand);
      } else {
        byLonghand.set(longhand, [shorthand]);
      }
    }
  }

  return { byLonghand, byShorthand: new Map(expansions) };
}

/**
 * Declares each logical property on a throwaway element in the given writing
 * mode to see which physical property takes the value.
 */
function buildLogicalNames(
  doc: Document,
  direction: string,
  writingMode: string
) {
  const window = doc.defaultView!;
  const probe = doc.createElement("div");
  probe.style.setProperty("direction", direction);
  probe.style.setProperty("writing-mode", writingMode);
  doc.body.appendChild(probe);

  const names = Array.from(window.getComputedStyle(probe));
  const physicalNames = names.filter((name) => !isLogical(name));
  const logicalNames = new Map<string, string>();

  for (const name of names.filter(isLogical)) {
    const marker = markerFor(name);
    probe.style.setProperty(name, marker);
    const styles = window.getComputedStyle(probe);
    const physical = physicalNames.find(
      (candidate) => styles.getPropertyValue(candidate) === marker
    );
    if (physical) {
      logicalNames.set(name, physical);
    }
    probe.style.removeProperty(name);
  }

  doc.body.removeChild(probe);

  return logicalNames;
}

/** A value the property accepts and nothing else on a bare element holds. */
function markerFor(name: string) {
  if (name.endsWith("-color")) {
    return "rgb(1, 2, 3)";
  }

  return name.endsWith("-style") ? "dotted" : "13px";
}
