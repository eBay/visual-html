<h1 align="center">
  <!-- Logo -->
  <img
    height="160"
    width="325"
    alt="Visual HTML"
    src="./assets/logo.png"
  />
	<br/>

  <!-- Language -->
  <a href="http://typescriptlang.org">
    <img src="https://img.shields.io/badge/%3C%2F%3E-typescript-blue.svg" alt="TypeScript"/>
  </a>
  <!-- Format -->
  <a href="https://github.com/prettier/prettier">
    <img src="https://img.shields.io/badge/styled_with-prettier-ff69b4.svg" alt="Styled with prettier"/>
  </a>
  <!-- CI -->
  <a href="https://travis-ci.org/eBay/visual-html">
  <img src="https://img.shields.io/travis/eBay/visual-html.svg" alt="Build status"/>
  </a>
  <!-- Coverage -->
  <a href="https://coveralls.io/github/eBay/visual-html">
    <img src="https://img.shields.io/coveralls/eBay/visual-html.svg" alt="Test Coverage"/>
  </a>
  <!-- NPM Version -->
  <a href="https://npmjs.org/package/visual-html">
    <img src="https://img.shields.io/npm/v/visual-html.svg" alt="NPM Version"/>
  </a>
  <!-- Downloads -->
  <a href="https://npmjs.org/package/visual-html">
    <img src="https://img.shields.io/npm/dm/visual-html.svg" alt="Downloads"/>
  </a>
</h1>

Blazing fast visual regression testing without the flakiness.

# Installation

```console
npm install visual-html
```

## Features

- Works in modern browsers and JSDOM (assuming you are loading styles in your tests).
- Snapshots are able to be rendered by a real browser, useful for debugging!
- Easily test and mock `@media` and `@supports` styles (see tests folder).
- Reduces implementation details in your snapshots.
- Supports inline styles and stylesheets/blocks.
- Supports CSS in JS or CSS in CSS!
- Supports pseudo elements.

Check out the [tests](./src/__tests__/index.ts) for some examples.

## API

### `visualHTML(div: Element, options?: { shallow?: boolean })`

```javascript
visualHTML(document.body); // Returns the visual information of all nested elements in the body.
visualHTML(document.body, { shallow: true }); // Returns just visual information for the `<body>` element.
```

## How it works

`visual-html` works by building up an HTML representation of the DOM including only attributes that account for the visual display of the element.
It will scan through all style sheets and inline the applied styles for an element, and strip any attributes that do not come with user agent styles.

Lets look at an example.

```html
<style>
  .my-component {
    width: 100px;
    height: 200px;
    background: red;
  }

  .my-component span {
    color: #333;
  }
</style>

<div
  class="my-component"
  data-testid="component-test-id"
  style="transform: translateX(-100px)"
>
  <span class="unused">Hello!</span>

  <form action="/login">
    <label>
      Username:
      <input type="text" name="username" />
    </label>

    <label>
      Password:
      <input type="password" name="password" />
    </label>

    <label>
      Remember Me:
      <input type="checkbox" name="remember" />
    </label>

    <button type="submit">Sign in</button>
  </form>
</div>
```

Passing the `div` element above to `visual-html` would yield the following:

```javascript
import visualHTML from "visual-html";

visualHTML(div); // Returns the html below as string.
```

```html
<div
  style="
  transform: translateX(-100px);
  width: 100px;
  height: 200px;
  background: red
"
>
  <span style="color: #333">
    Hello!
  </span>
  <form>
    <label>
      Username:
      <input />
    </label>
    <label>
      Password:
      <input />
    </label>
    <label>
      Remember Me:
      <input type="checkbox" />
    </label>
    <button>
      Sign in
    </button>
  </form>
</div>
```

In the above output you can see that the majority of attributes have been removed, and styles are now included inline. The `type="checkbox"` is still present on the `Remember Me:` checkbox as it causes the browser to display the textbox differently. The default `type` for an `input` is `text`, and a `type="password"` is visually identical to `type="text"` unless you've styled it differently yourself in which case an inline style attribute would be present.

## How is this different than x!?

### using an actual image based visual regression tool? (eg. puppeteer)

At the end of the day we are trying to test that our components display correctly, and to catch visual regressions, so why not use an image based visual regression tool? These tools require a real browser, and often can be slow and unreliable. Specifically browsers rely heavily on the operating system to render parts of the page such as fonts which can cause slight differences between screenshots taken from your local machine and your CI. You can get around this last part by having a CI or a local docker image but either way your compromising the speed of your tests and development workflow.

With this module we are not rendering actual pixels. Instead it pulls all visual information from the DOM and aggregates it into an HTML snapshot. You can build and compare these text based snapshots during your tests which is quick and repeatable. This can increasing your confidence without slowing down or complicating your work flow.

### inlining styles an snapshoting the element directly?

The key with snapshots is to avoid leaking in the implementation details of your tests.
Snapshots are easy to update, but if too much is leaking in they can often be hard to review.

In an ideal world a snapshot would automatically include just the critical assertions for what
you are testing so that you can confidently refactor your code without breaking your tests.

This is where `visual-html` comes in. It is a solution for testing the visual aspect of your components
and works to create a snapshot containing only visually relevant information.

### writing tests for classes on an element?

Testing the exact classes applied to an element often provides little value.
A simple way to determine the value of a test is to think about when it would break, and in turn which issues it would catch.

In the example below the tests do not know anything about `some-class`, what it does, or if it even has a matching css selector.

Imagine that `some-class` is really just a utility to visually highlight our element, our tests do not capture that at all.
By instead testing the applied styles you know that your CSS is actually hooked up properly, and you can have a better idea of
how the element would be visually displayed to the user.

```javascript
test("it has the right class", () => {
  const { container } = render(MyComponent);

  expect(container).not.toHaveClass("some-class");
  doThing();
  expect(container).toHaveClass("some-class");
});
```

vs

```javascript
import snapshotDiff from "snapshot-diff";

test("it is highlighted after the thing", () => {
  const { container } = render(MyComponent);
  const originalView = visualHTML(container);
  doThing();
  const updatedView = visualHTML(container);

  expect(snapshotDiff(originalView, updatedView)).toMatchInlineSnapshot(`
    "Snapshot Diff:
    - First value
    + Second value

    - <div/>
    + <div style=\\"border: 2px solid green\\"/>"
  `);
});
```

With the above you can refactor the way the element is highlighted (different class, inline styles, etc) and as long
as the element is still ultimately displayed the same, your snapshot will continue to pass.

## Code of Conduct

This project adheres to the [eBay Code of Conduct](http://ebay.github.io/codeofconduct). By participating in this project you agree to abide by its terms.
