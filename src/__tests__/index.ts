import visualHTML from "..";

declare global {
  interface Window {
    CSS: CSS;
  }
}

const { matchMedia: _matchMedia } = window;
const { supports: _supports } =
  window.CSS ||
  (window.CSS = {
    supports() {
      return false;
    }
  } as any);

afterEach(() => {
  window.matchMedia = _matchMedia;
  CSS.supports = _supports;
});

test("removes any properties that do not apply user agent styles", () => {
  expect(
    testHTML(`
      <input type="text" class="other"/>
    `)
  ).toMatchInlineSnapshot(`"<input/>"`);
});

test("preserves any properties that do apply user agent styles", () => {
  expect(
    testHTML(`
      <input type="search" class="other"/>
    `)
  ).toMatchInlineSnapshot(`"<input type=\\"search\\"/>"`);
});

test("preserves any inline styles", () => {
  expect(
    testHTML(`
      <div style="color:green"/>
    `)
  ).toMatchInlineSnapshot(`"<div style=\\"color: green\\"/>"`);
});

test("inline styles override applied styles", () => {
  expect(
    testHTML(
      `
        <div style="color:green"/>
      `,
      `
        div {
          background: red;
          color: blue;
        }
      `
    )
  ).toMatchInlineSnapshot(`
        "<div style=\\"
          color: green;
          background: red
        \\"/>"
    `);
});

test("accounts for !important", () => {
  expect(
    testHTML(
      `
        <div style="color:green !important;background: red"/>
      `,
      `
        div {
          background: blue !important;
          color: red !important;
        }
      `
    )
  ).toMatchInlineSnapshot(`
    "<div style=\\"
      color: green !important;
      background: blue !important
    \\"/>"
  `);
});

test("copies properties from applied styles", () => {
  expect(
    testHTML(
      `
      <div class="test"/>
    `,
      `
      .test {
        color: green;
      }
    `
    )
  ).toMatchInlineSnapshot(`"<div style=\\"color: green\\"/>"`);
});

test("accounts for applied style specificity", () => {
  expect(
    testHTML(
      `
        <div class="test"/>
      `,
      `
        div.test {
          color: blue;
        }

        .test {
          color: green;
        }
      `
    )
  ).toMatchInlineSnapshot(`"<div style=\\"color: blue\\"/>"`);
});

test("supports multiple applied styles", () => {
  expect(
    testHTML(
      `
        <div class="test"/>
      `,
      `
        div.test {
          color: blue;
          background-color: red;
          font-size: 1rem;
        }
      `
    )
  ).toMatchInlineSnapshot(`
            "<div style=\\"
              color: blue;
              background-color: red;
              font-size: 1rem
            \\"/>"
      `);
});

test("includes children", () => {
  expect(
    testHTML(
      `
        <div class="parent">
          <span class="child-a">A</span>
          <span class="child-b">B</span>
          <span class="child-c">C</span>
        </div>
      `,
      `
        .parent {
          background: red;
        }

        .child-a {
          color: green;
        }

        .child-b {
          color: red;
        }

        .child-c {
          color: blue;
        }
      `
    )
  ).toMatchInlineSnapshot(`
                "<div style=\\"background: red\\">
                  <span style=\\"color: green\\">
                    A
                  </span>
                  <span style=\\"color: red\\">
                    B
                  </span>
                  <span style=\\"color: blue\\">
                    C
                  </span>
                </div>"
        `);
});

test("evaluates media queries", () => {
  window.matchMedia = jest
    .fn()
    .mockReturnValueOnce({ matches: false })
    .mockReturnValueOnce({ matches: true });

  const html = `
    <div class="test"/>
  `;

  const styles = `
    .test {
      color: green;
    }

    @media(max-width: 600px) {
      .test {
        color: blue;
      }
    }
  `;

  expect(testHTML(html, styles)).toMatchInlineSnapshot(
    `"<div style=\\"color: green\\"/>"`
  );

  expect(testHTML(html, styles)).toMatchInlineSnapshot(
    `"<div style=\\"color: blue\\"/>"`
  );
});

test("evaluates supports queries", () => {
  window.CSS.supports = jest
    .fn()
    .mockReturnValueOnce(false)
    .mockReturnValueOnce(true);

  const html = `
    <div class="test"/>
  `;

  const styles = `
    .test {
      color: green;
    }

    @supports(something-new-feature: blue) {
      .test {
        color: blue;
      }
    }
  `;

  expect(testHTML(html, styles)).toMatchInlineSnapshot(
    `"<div style=\\"color: green\\"/>"`
  );

  expect(testHTML(html, styles)).toMatchInlineSnapshot(
    `"<div style=\\"color: blue\\"/>"`
  );
});

test("includes pseudo elements", () => {
  const html = `
    <div class="test">
      <span>Content</span>
    </div>
  `;

  const styles = `
    .test::after {
      content: "hello";
      color: green;
    }

    .test::selection {
      background: red;
    }

    ::selection {
      background: blue;
    }

    p::selection {
      background: green;
    }
  `;

  expect(testHTML(html, styles)).toMatchInlineSnapshot(`
                    "<div>
                      <style scoped>
                        ::selection {background: red}
                        ::after {
                          content: \\"hello\\";
                          color: green
                        }
                      </style>
                      <span>
                        <style scoped>
                          ::selection {background: blue}
                        </style>
                        Content
                      </span>
                    </div>"
          `);
});

function testHTML(html: string, styles: string = "") {
  const div = document.createElement("div");
  const style = document.createElement("style");
  style.innerHTML = styles;
  div.innerHTML = html;
  document.head.appendChild(style);
  document.body.appendChild(div);
  const result = Array.from(div.children)
    .map(el => visualHTML(el))
    .join("\n");
  document.body.removeChild(div);
  document.head.removeChild(style);
  return result;
}
