import { compare, calculate } from "specificity";
import splitSelectors from "./split-selector";
import { SelectorWithStyles } from "./types";
import { getDefaultStyles, getInitialStyles } from "./default-styles";
import {
  getShorthandsFor,
  getWrittenProperties,
  INHERITED_PROPERTIES,
} from "./properties";
const pseudoElementRegex =
  /([(>~|+\s])?\s*::?(before|after|checkmark|details-content|file-selector-button|first-letter|first-line|selection|backdrop|placeholder(?:-shown)|picker-icon|marker|spelling-error|grammar-error|target-text)(?![a-z-])/gi;

/**
 * Given a document, reads all style sheets returns extracts all CSSRules
 * in specificity order.
 */
export function getDocumentStyleRules(document: Document) {
  return Array.from(document.styleSheets)
    .map((sheet) =>
      getStyleRulesFromSheet(sheet as CSSStyleSheet, document.defaultView!)
    )
    .reduce(flatten, [])
    .sort((a, b) =>
      compare(calculate(b.selectorText), calculate(a.selectorText))
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
        .map(({ style }) => style)
    )
  );
}

/**
 * Given an element and global css rules, finds rules with pseudo elements
 * that apply to the element. Returns map containing the list of pseudo elements
 * with their applied css properties.
 */
export function getPseudoElementStyles(
  el: Element,
  rules: SelectorWithStyles[]
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
          style
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
      stylesByPseudoElement[name]
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
  styles: { [property: string]: string }
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
  window: Window
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
 * Given a style declaration and one of the properties it enumerates, returns
 * the declaration the author wrote, or null where there is none.
 */
function readDeclaration(
  style: CSSStyleDeclaration,
  name: string,
  doc: Document
): Declaration | null {
  let value = style.getPropertyValue(name);

  if (value === "") {
    const shorthand = getShorthandsFor(doc, name).find(
      (candidate) => style.getPropertyValue(candidate) !== ""
    );
    if (!shorthand) {
      return null;
    }
    name = shorthand;
    value = style.getPropertyValue(shorthand);
  }

  // An untouched longhand of a shorthand reads as `initial`, as does one an
  // author wrote; both stand for the initial value.
  if (value === "initial") {
    value = (getInitialStyles(doc)[name] as string) || value;
  }

  return {
    name,
    value,
    important: style.getPropertyPriority(name) === "important",
  };
}

/**
 * Given a list of css rules (in specificity order) returns the properties
 * applied accounting for !important values.
 */
function getAppliedStylesForElement(
  el: Element,
  pseudo: string | null,
  styles: CSSStyleDeclaration[]
) {
  const doc = el.ownerDocument!;
  const defaults = getDefaultStyles(el, pseudo);
  // `padding`, `padding-left` and `padding-inline-start` all write the same
  // property, so declarations are settled per property rather than per name.
  const winners = new Map<string, Declaration>();

  for (const style of styles) {
    const writtenHere = new Set<string>();

    for (let i = 0, len = style.length; i < len; i++) {
      const declaration = readDeclaration(style, style[i], doc);
      if (!declaration) {
        continue;
      }

      for (const property of getWrittenProperties(el, declaration.name)) {
        const holder = winners.get(property);
        if (
          !holder ||
          writtenHere.has(property) ||
          (declaration.important && !holder.important)
        ) {
          winners.set(property, declaration);
          writtenHere.add(property);
        }
      }
    }
  }

  let properties: { [x: string]: string } | null = null;
  for (const { name, value } of new Set(winners.values())) {
    if (value !== defaults[name] || INHERITED_PROPERTIES.has(name)) {
      properties = properties || {};
      properties[name] = value;
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

interface Declaration {
  name: string;
  value: string;
  important: boolean;
}
