declare global {
  interface CSSRule {
    selectorText: string;
  }
}

export interface VisualData {
  tagName: string;
  attributes: Array<{ name: string; value: string | boolean | null }> | null;
  styles: { [x: string]: string } | null;
  pseudoStyles: { [x: string]: { [x: string]: string } } | null;
  children: Array<VisualData | string> | null;
}
export interface Options {
  shallow?: boolean;
  /** Rules from `getDocumentStyleRules`, to reuse across captures. */
  styleRules?: SelectorWithStyles[];
}

export interface SelectorWithStyles {
  selectorText: string;
  style: CSSStyleDeclaration;
}
