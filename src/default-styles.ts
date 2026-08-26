const cache: { [x: string]: { [x: string]: unknown } } = Object.create(null);
let supportsPseudoElements: boolean | undefined;

/**
 * Gets the default styles for an element or pseudo element. Works by creating
 * an element in an iframe without any styles and reading the default computed styles.
 */
export function getDefaultStyles(el: Element, pseudo: string | null) {
  const unstyled = el.cloneNode(false) as Element;
  unstyled.removeAttribute("style");
  const doc = el.ownerDocument!;
  // User agent styles select on attributes too: a checkbox has none of the
  // border, padding and background a text input has.
  const key = `${el.namespaceURI}:${unstyled.outerHTML}:${pseudo}:${doc.compatMode}`;
  let cached = cache[key];

  if (!cached) {
    const frame = doc.createElement("iframe");
    doc.body.appendChild(frame);
    const frameDoc = frame.contentDocument!;
    // A blank frame is in quirks mode, where an input is border-box rather
    // than content-box; match the document being captured.
    if (doc.compatMode === "CSS1Compat") {
      frameDoc.open();
      frameDoc.write("<!doctype html>");
      frameDoc.close();
    }
    const frameWindow = frameDoc.defaultView!;
    const clone = frameDoc.importNode(unstyled, false);
    frameDoc.body.appendChild(clone);

    cached = cache[key] = cloneStyles(
      getComputedStyle(frameWindow, clone, pseudo)
    );

    doc.body.removeChild(frame);
  }

  return cached;
}

let initialStyles: { [x: string]: unknown } | undefined;

/**
 * Gets what a declared `initial` resolves to. These belong to CSS rather than
 * to any element, so one probe answers for every capture.
 */
export function getInitialStyles(doc: Document) {
  if (!initialStyles) {
    const probe = doc.createElement("div");
    probe.style.setProperty("all", "initial");
    doc.body.appendChild(probe);
    initialStyles = cloneStyles(doc.defaultView!.getComputedStyle(probe));
    doc.body.removeChild(probe);
  }

  return initialStyles;
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
