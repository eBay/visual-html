const cache: { [x: string]: { [x: string]: unknown } } = Object.create(null);
let supportsPseudoElements: boolean | undefined;

/**
 * Gets the default styles for an element or pseudo element. Works by creating
 * an element in an iframe without any styles and reading the default computed styles.
 */
export function getDefaultStyles(el: Element, pseudo: string | null) {
  const key = `${el.namespaceURI}:${el.localName}:${pseudo}`;
  let cached = cache[key];

  if (!cached) {
    const doc = el.ownerDocument!;
    const frame = doc.createElement("iframe");
    doc.body.appendChild(frame);
    const frameDoc = frame.contentDocument!;
    const frameWindow = frameDoc.defaultView!;
    const clone = frameDoc.importNode(el, false);
    clone.removeAttribute("style");
    frameDoc.body.appendChild(clone);

    cached = cache[key] = cloneStyles(
      getComputedStyle(frameWindow, clone, pseudo)
    );

    doc.body.removeChild(frame);
  }

  return cached;
}

function cloneStyles(styles: CSSStyleDeclaration) {
  const result = Object.create(null) as { [x: string]: unknown };

  for (let i = styles.length; i--; ) {
    const name = styles[i];
    result[name] = styles.getPropertyValue(name);
  }

  return result;
}

function getComputedStyle(window: Window, el: Element, pseudo: string | null) {
  if (supportsPseudoElements === undefined) {
    // JSDOM cannot use getComputedStyle for pseudo elements.
    supportsPseudoElements = !navigator.userAgent.includes("jsdom");
  }

  return window.getComputedStyle(el, supportsPseudoElements ? pseudo : null);
}
