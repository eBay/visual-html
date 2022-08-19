export const HTML_PROPERTIES = {
  align: {
    alias: false,
    tests: [
      test([
        "applet",
        "caption",
        "col",
        "colgroup",
        "hr",
        "iframe",
        "img",
        "table",
        "tbody",
        "td",
        "tfoot",
        "th",
        "thead",
        "tr",
      ]),
    ],
  },
  autoplay: {
    alias: false,
    tests: [test(["audio", "video"])],
  },
  background: {
    alias: false,
    tests: [test(["body", "table", "td", "th"])],
  },
  bgColor: {
    alias: "bgcolor",
    tests: [
      test([
        "body",
        "col",
        "colgroup",
        "table",
        "tbody",
        "tfoot",
        "td",
        "th",
        "tr",
      ]),
    ],
  },
  border: {
    alias: false,
    tests: [test(["img", "object", "table"])],
  },
  checked: {
    alias: false,
    tests: [
      test("input", (it: HTMLInputElement) =>
        /^(?:checkbox|radio)$/.test(it.type)),
    ],
  },
  color: {
    alias: false,
    tests: [test(["basefont", "font", "hr"])],
  },
  cols: {
    alias: false,
    tests: [test("textarea")],
  },
  colSpan: {
    alias: "colspan",
    tests: [test(["td", "th"])],
  },
  controls: {
    alias: false,
    tests: [test(["audio", "video"])],
  },
  coords: {
    alias: false,
    tests: [test("area")],
  },
  currentSrc: {
    alias: "src",
    tests: [test(["audio", "img", "source", "video"])],
  },
  data: {
    alias: false,
    tests: [test("object")],
  },
  default: {
    alias: false,
    tests: [test("track")],
  },
  dir: {
    alias: false,
    tests: [test(/./)],
  },
  disabled: {
    alias: false,
    tests: [
      test([
        "button",
        "fieldset",
        "input",
        "optgroup",
        "option",
        "select",
        "textarea",
      ]),
    ],
  },
  height: {
    alias: false,
    tests: [
      test(["canvas", "embed", "iframe", "img", "input", "object", "video"]),
    ],
  },
  hidden: {
    alias: false,
    tests: [test(/./)],
  },
  high: {
    alias: false,
    tests: [test("meter")],
  },
  inputMode: {
    alias: "inputmode",
    tests: [
      test("textarea"),
      test(/./, (it: HTMLElement) => it.isContentEditable),
    ],
  },
  kind: {
    alias: false,
    tests: [test("track")],
  },
  label: {
    alias: false,
    tests: [test(["optgroup", "option", "track"])],
  },
  loop: {
    alias: false,
    tests: [test(["audio", "video"])],
  },
  low: {
    alias: false,
    tests: [test("meter")],
  },
  max: {
    alias: false,
    tests: [test("input", isInputWithBoundaries), test(["meter", "progress"])],
  },
  maxLength: {
    alias: "maxlength",
    tests: [test("input", isInputWithPlainText), test("textarea")],
  },
  minLength: {
    alias: "minlength",
    tests: [test("input", isInputWithPlainText), test("textarea")],
  },
  min: {
    alias: false,
    tests: [test("meter"), test("input", isInputWithBoundaries)],
  },
  multiple: {
    alias: false,
    tests: [
      test("input", (it: HTMLInputElement) => it.type === "file"),
      test("select"),
    ],
  },
  open: {
    alias: false,
    tests: [test(["details", "dialog"])],
  },
  optimum: {
    alias: false,
    tests: [test("meter")],
  },
  placeholder: {
    alias: false,
    tests: [test(["input", "textarea"])],
  },
  poster: {
    alias: false,
    tests: [test("video")],
  },
  readOnly: {
    alias: "readonly",
    tests: [test(["input", "textarea"])],
  },
  reversed: {
    alias: false,
    tests: [test("ol")],
  },
  rows: {
    alias: false,
    tests: [test("textarea")],
  },
  rowSpan: {
    alias: "rowspan",
    tests: [test(["td", "th"])],
  },
  selected: {
    alias: false,
    tests: [test("option")],
  },
  size: {
    alias: false,
    tests: [test("input", isInputWithPlainText), test("select")],
  },
  span: {
    alias: false,
    tests: [test(["col", "colgroup"])],
  },
  src: {
    alias: false,
    tests: [test(["embed", "iframe", "track"])],
  },
  srcdoc: {
    alias: false,
    tests: [test("iframe")],
  },
  sizes: {
    alias: false,
    tests: [test(["img", "source"])],
  },
  start: {
    alias: false,
    tests: [test("ol")],
  },
  title: {
    alias: false,
    tests: [test("abbr")],
  },
  type: {
    alias: false,
    tests: [test("input"), test("ol")],
  },
  value: {
    alias: false,
    tests: [
      test("input", (it: HTMLInputElement) =>
        /^(?!checkbox|radio)$/.test(it.type)),
      test(["meter", "progress"]),
      test("li", (it: HTMLLIElement) => it.parentElement!.localName === "ol"),
    ],
  },
  width: {
    alias: false,
    tests: [
      test(["canvas", "embed", "iframe", "img", "input", "object", "video"]),
    ],
  },
  wrap: {
    alias: false,
    tests: [test("textarea")],
  },
} as const;

function isInputWithBoundaries(input: HTMLInputElement) {
  return /^(?:number|range|date|datetime-local|year|month|week|day|time)$/.test(
    input.type
  );
}

function isInputWithPlainText(input: HTMLInputElement) {
  return /^(?:text|search|tel|email|password|url)$/.test(input.type);
}

function test<T extends Element>(
  localNames: RegExp | string[] | string,
  check: (instance: T) => boolean = pass
) {
  if (typeof localNames === "string") {
    localNames = [localNames];
  }

  const reg = Array.isArray(localNames)
    ? new RegExp(`^(?:${localNames.join("|")})$`)
    : localNames;
  return (instance: T) => reg.test(instance.localName) && check(instance);
}

function pass() {
  return true;
}
