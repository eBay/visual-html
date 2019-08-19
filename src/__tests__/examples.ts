import snapshotDiff from "snapshot-diff";
import visualHTML from "..";

test("runs the first example", () => {
  expect(
    testHTML(
      `
      <div
        class="my-component"
        data-testid="component-test-id"
        style="transform: translateX(-100px)">
        <span class="unused">Hello!</span>
      
        <form action="/login">
          <label>
            Username:
            <input type="text" name="username"/>
          </label>
      
          <label>
            Password:
            <input type="password" name="password"/>
          </label>
      
          <label>
            Remember Me:
            <input type="checkbox" name="remember"/>
          </label>
      
          <button type="submit">Sign in</button>
        </form>
      </div>
    `,
      `
      .my-component {
        width: 100px;
        height: 200px;
        background: red;
      }

      .my-component span {
        color: #333;
      }
    `
    )
  ).toMatchInlineSnapshot(`
        "<div style=\\"
          transform: translateX(-100px);
          width: 100px;
          height: 200px;
          background: red
        \\">
          <span style=\\"color: #333\\">
            Hello!
          </span>
          <form>
            <label>
              Username:
              <input/>
            </label>
            <label>
              Password:
              <input/>
            </label>
            <label>
              Remember Me:
              <input type=\\"checkbox\\"/>
            </label>
            <button>
              Sign in
            </button>
          </form>
        </div>"
    `);
});

test("works with diff snapshots", () => {
  const styles = `
    .my-component.highlight {
      border: 2px solid green;
    }
  `;

  expect(
    snapshotDiff(
      testHTML(`<div class="my-component"/>`, styles),
      testHTML(`<div class="my-component highlight"/>`, styles)
    )
  ).toMatchInlineSnapshot(`
    "Snapshot Diff:
    - First value
    + Second value

    - <div/>
    + <div style=\\"border: 2px solid green\\"/>"
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
