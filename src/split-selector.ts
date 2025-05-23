export default function splitSelectors(selectorText: string) {
  const selectors: string[] = [];
  let current = "";
  let depth = 0;
  let inAttr = false;
  let inQuote = false;
  let quoteChar = "";
  let escape = false;
  let i = 0;

  while (i < selectorText.length) {
    const char = selectorText[i];
    const nextChar = selectorText[i + 1];

    if (escape) {
      current += char;
      escape = false;
    } else if (char === "\\") {
      escape = true;
      current += char;
    } else if (inQuote) {
      current += char;
      if (char === quoteChar) {
        inQuote = false;
        quoteChar = "";
      }
    } else if (char === '"' || char === "'") {
      inQuote = true;
      quoteChar = char;
      current += char;
    } else if (char === "/" && nextChar === "*") {
      // Skip over comment block
      i += 2;
      while (
        i < selectorText.length &&
        !(selectorText[i] === "*" && selectorText[i + 1] === "/")
      ) {
        i++;
      }
      i += 1; // Skip closing /
    } else if (char === "[") {
      inAttr = true;
      current += char;
    } else if (char === "]") {
      inAttr = false;
      current += char;
    } else if (char === "(" && !inAttr) {
      depth++;
      current += char;
    } else if (char === ")" && !inAttr) {
      depth--;
      current += char;
    } else if (char === "," && depth === 0 && !inAttr) {
      selectors.push(current.trim());
      current = "";
    } else {
      current += char;
    }

    i++;
  }

  if (current.trim()) {
    selectors.push(current.trim());
  }

  return selectors;
}
