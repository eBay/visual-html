import { compare, calculate } from "specificity";
import splitSelectors from "./split-selector";
import { SelectorWithStyles } from "./types";
import { getDefaultStyles } from "./default-styles";
const pseudoElementRegex =
  /([>~|+\s])?\s*::?(before|after|first-letter|first-line|selection|backdrop|placeholder|marker|spelling-error|grammar-error|target(?:-text)?)/gi;

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

      baseSelector =
        baseSelector.slice(0, match.index) + (childCombinator || "");
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
    if (styles) {
      appliedPseudoElementStyles ||= {};
      appliedPseudoElementStyles[name] = styles;
    }
  }

  return appliedPseudoElementStyles;
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
 * Given a list of css rules (in specificity order) returns the properties
 * applied accounting for !important values.
 */
function getAppliedStylesForElement(
  el: Element,
  pseudo: string | null,
  styles: CSSStyleDeclaration[]
) {
  let properties: { [x: string]: string } | null = null;
  const defaults = getDefaultStyles(el, pseudo);
  const seen: Set<string> = new Set();
  const important: Set<string> = new Set();

  for (const style of styles) {
    for (let i = 0, len = style.length; i < len; i++) {
      let name = style[i];
      let value = style.getPropertyValue(name);
      while (value === "") {
        const dashIndex = name.lastIndexOf("-");
        if (dashIndex !== -1) {
          name = name.slice(0, dashIndex);
          value = style.getPropertyValue(name);
        } else {
          break;
        }
      }

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
