import { VisualData, Options } from "./types";
import { stringifyVisualData } from "./stringify";
import { getVisualAttributes } from "./attributes";
import {
  getDocumentStyleRules,
  getElementStyles,
  getPseudoElementStyles
} from "./stylesheets";

export { VisualData, Options };

const ELEMENT_TYPE = 1;
const TEXT_TYPE = 3;

/**
 * Given an element, returns a string of HTML text containing only
 * attributes and styles that convey visual information.
 */
export default function visualHTML(el: Element, options: Options = {}) {
  return stringifyVisualData(
    getVisualData(el, {
      ...options,
      styleRules: getDocumentStyleRules(el.ownerDocument!)
    })
  );
}

/**
 * Given an element, returns an object with information about the visual aspects
 * including styles, psuedo elements, and text content of the element.
 */
function getVisualData<T extends Element>(
  el: T,
  options: Options & { styleRules: CSSStyleRule[] }
) {
  const window = el.ownerDocument!.defaultView!;
  let childrenVisualData: Array<VisualData | string> | null = null;

  if (window.getComputedStyle(el).display === "none") {
    return null;
  }

  if (!options.shallow && el.firstChild) {
    let curNode: ChildNode | null = el.firstChild;
    childrenVisualData = [];

    do {
      switch (curNode.nodeType) {
        case ELEMENT_TYPE:
          const childDisplayData = getVisualData(curNode as Element, options);
          if (childDisplayData) {
            childrenVisualData.push(childDisplayData);
          }
          break;
        case TEXT_TYPE:
          childrenVisualData.push(curNode!.nodeValue as string);
          break;
      }

      curNode = curNode.nextSibling;
    } while (curNode);
  }

  return {
    tagName: el.tagName,
    styles: getElementStyles(el, options.styleRules),
    pseudoStyles: getPseudoElementStyles(el, options.styleRules),
    attributes: getVisualAttributes(el),
    children: childrenVisualData
  } as VisualData;
}
