import { HTML_PROPERTIES } from "./html-properties";

/**
 * Given an element, returns any attributes that have a cause a visual change.
 * This works by checking against a whitelist of known visual properties, and
 * their related attribute name.
 */
export function getVisualAttributes(el: Element) {
  let visualAttributes: Array<{
    name: string;
    value: string | boolean | null;
  }> | null = null;
  if (!el.namespaceURI || el.namespaceURI === "http://www.w3.org/1999/xhtml") {
    // For HTML elements we look at a whitelist of properties and compare against the default value.
    const defaults = el.ownerDocument!.createElement(el.localName);

    for (const prop in HTML_PROPERTIES) {
      const { alias, tests } = HTML_PROPERTIES[
        prop as keyof typeof HTML_PROPERTIES
      ];
      const name = alias || prop;
      const value = el[prop];

      if (value !== defaults[prop]) {
        for (const test of tests) {
          if (test(el)) {
            (visualAttributes || (visualAttributes = [])).push({ name, value });
            break;
          }
        }
      }
    }
  } else {
    // For other namespaces we assume all attributes are visual, except for a blacklist.
    const { attributes } = el;

    for (let i = 0, len = attributes.length; i < len; i++) {
      const { name, value } = attributes[i];

      if (
        !(
          (/^(?:xlink:)?href$/i.test(name) && el.localName !== "a" && el.localName !== "use") ||
          /^(?:class|id|style|lang|target|xmlns(?::.+)?|xlink:.+|xml:(?:lang|base)|on.+|(?:aria|data)-.+)$/i.test(
            name
          )
        )
      ) {
        (visualAttributes || (visualAttributes = [])).push({ name, value });
      }
    }
  }

  return visualAttributes;
}
