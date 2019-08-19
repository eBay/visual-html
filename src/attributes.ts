let FRAME: HTMLIFrameElement | null = null;

/**
 * Given an element, returns any attributes that have a cause a visual change.
 * This works by copying the element to an iframe without any styles and
 * testing the computed styles while toggling the attributes.
 */
export function getVisualAttributes(el: Element) {
  let visualAttributes: Array<{ name: string; value: string }> | null = null;
  const document = el.ownerDocument!;
  FRAME = FRAME || document.createElement("iframe");

  document.body.appendChild(FRAME);

  const contentDocument = FRAME.contentDocument!;
  const contentWindow = contentDocument.defaultView!;
  const clone = contentDocument.importNode(el, false);
  const { attributes } = clone;

  contentDocument.body.appendChild(clone);

  const defaultStyles = contentWindow.getComputedStyle(clone);

  for (let i = attributes.length; i--; ) {
    const attr = attributes[i];

    if (attr.name === "style") {
      continue;
    }

    clone.removeAttributeNode(attr);

    if (
      !computedStylesEqual(defaultStyles, contentWindow.getComputedStyle(clone))
    ) {
      (visualAttributes || (visualAttributes = [])).push({
        name: attr.name,
        value: attr.value
      });
    }

    clone.setAttributeNode(attr);
  }

  contentDocument.body.removeChild(clone);
  document.body.removeChild(FRAME);

  return visualAttributes;
}

/**
 * Checks if two CSSStyleDeclarations have the same styles applied.
 */
function computedStylesEqual(a: CSSStyleDeclaration, b: CSSStyleDeclaration) {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = a.length; i--; ) {
    const name = a[i];

    if (a[name] !== b[name]) {
      return false;
    }
  }

  return true;
}
