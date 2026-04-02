import { compare, calculate } from "specificity";
import splitSelectors from "./split-selector";
import { SelectorWithStyles } from "./types";
import { getDefaultStyles } from "./default-styles";
const pseudoElementRegex =
  /([(>~|+\s])?\s*::?(before|after|checkmark|details-content|file-selector-button|first-letter|first-line|selection|backdrop|placeholder(?:-shown)|picker-icon|marker|spelling-error|grammar-error|target-text)(?![a-z-])/gi;

/**
 * Given a document, reads all style sheets returns extracts all CSSRules
 * in specificity order.
 */
export function getDocumentStyleRules(document: Document) {
  return Array.from(document.styleSheets)
    .map((sheet) =>
      getStyleRulesFromSheet(sheet as CSSStyleSheet, document.defaultView!),
    )
    .reduce(flatten, [])
    .sort((a, b) =>
      compare(calculate(b.selectorText), calculate(a.selectorText)),
    );
}

/**
 * Given an element and global css rules, finds rules that apply to that
 * element (including the inline styles) and returns the specified css
 * properties as an object.
 */
export function getElementStyles(el: Element, rules: SelectorWithStyles[]) {
  return getAppliedStylesForElement(
    el,
    null,
    [(el as HTMLElement).style].concat(
      rules
        .filter((rule) => el.matches(rule.selectorText))
        .map(({ style }) => style),
    ),
  );
}

/**
 * Given an element and global css rules, finds rules with pseudo elements
 * that apply to the element. Returns map containing the list of pseudo elements
 * with their applied css properties.
 */
export function getPseudoElementStyles(
  el: Element,
  rules: SelectorWithStyles[],
) {
  const stylesByPseudoElement = rules.reduce((rulesByPseudoElement, rule) => {
    const { selectorText, style } = rule;
    let baseSelector = selectorText;
    let match: RegExpExecArray | null = null;
    let seenPseudos: string[] | null = null;

    while ((match = pseudoElementRegex.exec(baseSelector))) {
      const name = `::${match[2]}`;
      const childCombinator = match[1];

      if (seenPseudos) {
        if (!seenPseudos.includes(name)) {
          seenPseudos.push(name);
        }
      } else {
        seenPseudos = [name];
      }

      baseSelector = childCombinator
        ? baseSelector.slice(0, match.index) +
          childCombinator +
          "*" +
          baseSelector.slice(match.index + match[0].length)
        : baseSelector.slice(0, match.index) +
          baseSelector.slice(match.index + match[0].length);
    }

    if (seenPseudos && el.matches(baseSelector || "*")) {
      for (const name of seenPseudos) {
        (rulesByPseudoElement[name] || (rulesByPseudoElement[name] = [])).push(
          style,
        );
      }
    }

    return rulesByPseudoElement;
  }, {});

  let appliedPseudoElementStyles: null | {
    [name: string]: { [property: string]: string };
  } = null;

  for (const name in stylesByPseudoElement) {
    const styles = getAppliedStylesForElement(
      el,
      name,
      stylesByPseudoElement[name],
    );
    if (styles && shouldIncludePseudoElement(name, styles)) {
      appliedPseudoElementStyles ||= {};
      appliedPseudoElementStyles[name] = styles;
    }
  }

  return appliedPseudoElementStyles;
}

function shouldIncludePseudoElement(
  pseudoName: string,
  styles: { [property: string]: string },
): boolean {
  if (pseudoName !== "::before" && pseudoName !== "::after") {
    // Other pseudo-elements (::selection, ::first-line, etc.) should always be included.
    return true;
  }

  const contentValue = styles.content;

  // Pseudo-element renders if:
  // - content property exists (not undefined).
  // - content: "" (empty string).
  // - content is not "none".
  return contentValue !== undefined && contentValue !== "none";
}

/**
 * Given a stylesheet returns all css rules including rules from
 * nested stylesheets such as media queries or supports.
 */
function getStyleRulesFromSheet(
  sheet: CSSStyleSheet | CSSMediaRule | CSSSupportsRule,
  window: Window,
) {
  const styleRules: SelectorWithStyles[] = [];
  const curRules = sheet.cssRules;
  for (let i = curRules.length; i--; ) {
    const rule = curRules[i];

    if (isStyleRule(rule)) {
      for (const selector of splitSelectors(rule.selectorText) as string[]) {
        styleRules.push({ selectorText: selector, style: rule.style });
      }
    } else if (isMediaRule(rule) && window.matchMedia) {
      if (window.matchMedia(rule.media.mediaText).matches) {
        styleRules.push(...getStyleRulesFromSheet(rule, window));
      }
    } else if (isSupportsRule(rule)) {
      if (CSS.supports(rule.conditionText)) {
        styleRules.push(...getStyleRulesFromSheet(rule, window));
      }
    }
  }

  return styleRules;
}

/**
 * Parses a CSSStyleDeclaration's cssText into an array of {name, value} pairs.
 * This captures shorthand properties that contain var() references which
 * browsers cannot expand into longhands at parse time.
 */
function parseCssTextDeclarations(
  style: CSSStyleDeclaration,
): { name: string; value: string }[] {
  const results: { name: string; value: string }[] = [];
  const cssText = style.cssText;
  if (!cssText) return results;

  let i = 0;
  const len = cssText.length;

  while (i < len) {
    // Skip whitespace
    while (i < len && (cssText[i] === " " || cssText[i] === "\t")) i++;

    // Read property name
    const nameStart = i;
    while (
      i < len &&
      cssText[i] !== ":" &&
      cssText[i] !== ";" &&
      cssText[i] !== " "
    )
      i++;
    const name = cssText.slice(nameStart, i).trim();

    // Skip whitespace
    while (i < len && (cssText[i] === " " || cssText[i] === "\t")) i++;

    // Expect ':'
    if (i < len && cssText[i] === ":") {
      i++;
    } else {
      // Malformed or end — skip to next ';'
      while (i < len && cssText[i] !== ";") i++;
      if (i < len) i++;
      continue;
    }

    // Skip whitespace
    while (i < len && (cssText[i] === " " || cssText[i] === "\t")) i++;

    // Read value, respecting nested parentheses (e.g. var(--x, calc(100% - 20px)))
    const valueStart = i;
    let parenDepth = 0;
    while (i < len) {
      const ch = cssText[i];
      if (ch === "(") {
        parenDepth++;
      } else if (ch === ")") {
        parenDepth--;
      } else if (ch === ";" && parenDepth === 0) {
        break;
      }
      i++;
    }
    const value = cssText.slice(valueStart, i).trim();
    if (i < len && cssText[i] === ";") i++;

    // Strip !important suffix (priority is handled separately via getPropertyPriority)
    const cleanValue = value.endsWith("!important")
      ? value.slice(0, -"!important".length).trim()
      : value;

    if (name && cleanValue) {
      results.push({ name, value: cleanValue });
    }
  }

  return results;
}

/**
 * Given a list of css rules (in specificity order) returns the properties
 * applied accounting for !important values.
 */
function getAppliedStylesForElement(
  el: Element,
  pseudo: string | null,
  styles: CSSStyleDeclaration[],
) {
  let properties: { [x: string]: string } | null = null;
  const defaults = getDefaultStyles(el, pseudo);
  const seen: Set<string> = new Set();
  const important: Set<string> = new Set();

  for (const style of styles) {
    const emptyLonghands: Set<string> = new Set();

    for (let i = 0, len = style.length; i < len; i++) {
      const name = style[i];
      const value = style.getPropertyValue(name);

      if (value === "") {
        // Browser listed a longhand but can't resolve it individually —
        // likely a shorthand with var(). Track it for the cssText fallback.
        emptyLonghands.add(name);
        continue;
      }

      if (value !== "initial" && value !== defaults[name]) {
        const isImportant = style.getPropertyPriority(name) === "important";

        if (properties) {
          if (!seen.has(name) || (isImportant && !important.has(name))) {
            properties[name] = value;
          }
        } else {
          properties = { [name]: value };
        }

        if (isImportant) {
          important.add(name);
        }
      }

      seen.add(name);
    }

    // Second pass: when longhands had empty values, fall back to parsing
    // cssText to recover shorthand properties containing var() references.
    if (emptyLonghands.size > 0) {
      for (const { name, value } of parseCssTextDeclarations(style)) {
        // Skip properties already handled in the first pass, and skip
        // longhands that we already know are empty (they're covered by
        // whatever shorthand we find here).
        if (emptyLonghands.has(name) || seen.has(name)) continue;

        if (value !== "initial" && value !== "" && value !== defaults[name]) {
          const isImportant = style.getPropertyPriority(name) === "important";

          if (properties) {
            if (!seen.has(name) || (isImportant && !important.has(name))) {
              properties[name] = value;
            }
          } else {
            properties = { [name]: value };
          }

          if (isImportant) {
            important.add(name);
          }
        }

        seen.add(name);
      }
    }
  }

  return properties;
}

function isStyleRule(rule: CSSRule): rule is CSSStyleRule {
  return rule.type === 1;
}

function isMediaRule(rule: CSSRule): rule is CSSMediaRule {
  return rule.type === 4;
}

function isSupportsRule(rule: CSSRule): rule is CSSSupportsRule {
  return rule.type === 12;
}

function flatten<T extends unknown>(a: T[], b: T[]): T[] {
  return a.concat(b);
}
