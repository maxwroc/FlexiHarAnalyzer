# FlexiHarAnalyzer

FlexiHarAnalyzer is a browser-based viewer for HTTP Archive (HAR) files. It turns a HAR capture into a searchable request list and detail view, and lets you add JavaScript parsers to interpret application-specific requests and responses.

**Use the app:** [maxwroc.github.io/FlexiHarAnalyzer](https://maxwroc.github.io/FlexiHarAnalyzer/)

## Table of contents

- [Overview](#overview)
- [Features](#features)
- [Using the app](#using-the-app)
- [Parser and plugin development](#parser-and-plugin-development)
  - [Parser contract](#parser-contract)
  - [Minimal parser example](#minimal-parser-example)
  - [Adding and managing parsers](#adding-and-managing-parsers)
- [Local development](#local-development)
- [License](#license)

## Overview

HAR files record browser network activity, but their request and response bodies can be difficult to inspect—especially when an application uses custom endpoints or response formats. FlexiHarAnalyzer presents the entries in a navigable table and displays request and response details side by side. Custom parsers can recognize application-specific requests, extract useful columns, and provide structured detail tabs without changing the app.

The tool is useful for developers, QA engineers, and anyone investigating browser network captures. It runs as a static web application; HAR files and parser scripts are processed in the browser.

## Features

- Load a HAR file by dragging it into the file area, then inspect its entries in a request list and detail pane.
- Search request URLs, headers, and bodies, as well as response headers and bodies. Search supports case-sensitive matching and regular expressions, highlights matching entries, and shows matching snippets in a Search tab.
- Filter the list to highlighted requests. Parsers can mark matching entries for this workflow.
- Inspect standard request and response data, including headers, cookies, query parameters, bodies, status, and size.
- Parse JSON response content for a preview, and decode JWT header and payload data from an Authorization header when possible.
- Preview supported embedded image responses: PNG, JPEG, GIF, WebP, SVG, BMP, ICO, and AVIF.
- Create, edit, download, and remove JavaScript parsers in the app. Parser scripts are saved in browser local storage and restored on later visits in the same browser profile.
- Load bundled examples, which pair sample HAR files with their related parsers. Examples are discovered from the `examples/` directory at build time.
- If a HAR file is invalid JSON, the app offers to attempt a structural repair by closing incomplete JSON structures. This cannot recover missing data.

### Built-in parsers

| Parser | Behavior |
| --- | --- |
| `generic` | Handles every HAR entry. Adds the default request columns and Request and Response tabs; adds an Auth tab when an Authorization header is present. Displays JSON response previews and raw response data when available. |
| `image` | Recognizes entries with supported image MIME types and embedded response text, and adds an Image preview tab. |

The example parsers in `examples/google.com/` and `examples/reddit.com/` demonstrate extracting query values into a custom column and rendering endpoint-specific response data.

## Using the app

1. Open the [deployed app](https://maxwroc.github.io/FlexiHarAnalyzer/) or run it locally.
2. Drag a `.har` file into the HAR drop area, then select **Load files**. Alternatively, choose **Load example** to open a bundled capture and its associated parser scripts.
3. Select a request to inspect its available detail tabs. Use the search button to find text in selected request or response fields.
4. To add a parser, drag one or more JavaScript files into the parser area or choose **+ New parser** to edit one in the built-in editor.

## Parser and plugin development

Parsers are plain JavaScript files executed in the app page. Register each parser by assigning a factory function to the global `request_parsers` object. Each registration key must be unique among loaded parsers. The factory receives a context object and returns an object implementing the parser contract.

Custom scripts execute with the privileges of the page. Only load parser code you trust.

### Parser contract

The app calls these members on the parser returned by your factory:

| Member | Purpose |
| --- | --- |
| `isRequestSupported(entry)` | Return `true` when the parser should handle this HAR entry. |
| `getColumnsInfo` | Array of custom columns, each with a `name` and optionally an `id` and `defaultWidth`. When `id` is omitted, the column name is used as its key. |
| `getColumnValues(entry)` | Return an object mapping column IDs (or names when no ID is set) to values for a supported entry. |
| `getCustomTabs(entry)` | Return an array of `{ name, getFields(entry) }` tabs, or no value when the parser has no tabs for the entry. |
| `highlightRequest` | Set to `false` to avoid highlighting supported entries. If omitted or truthy, supported entries are highlighted and included when **Show highlighted requests only** is enabled. |

`entry` is a HAR log entry (`Entry` from `har-format`). The factory's `context` currently provides `getJsonContent(content)`, which returns parsed JSON for JSON response content, or `null` when it cannot parse it.

`getFields` returns an array of display fields. Supported field types are:

- `header` with `label`
- `text` or `large-text` with an optional `label` and a `string` or `number` `value`
- `json` with an object `value` and optional display `options`
- `table` with `headers` (`name`, `key`, and optional `width` or `copyButton`) and `values` (objects keyed by each header's `key`)
- `container` with `fields`, an optional `label`, and an optional `style` of `accordion`
- `label` with an optional `label`
- `link` with `href` and optional `text` and `label`
- `input-group` with `value1`, `value2`, and optional `staticPart` (`first` or `second`) and `label`
- `image` with `src`, `mimeType`, and `size`
- `hint` with `value` and optional `style` (`info`, `warning`, or `error`) and `label`

### Minimal parser example

Save this as a `.js` file and load it using the parser area in the app:

```js
request_parsers["api-search"] = (context) => ({
  highlightRequest: true,
  getColumnsInfo: [
    { id: "search_query", name: "Search query", defaultWidth: 180 },
  ],
  isRequestSupported(entry) {
    return new URL(entry.request.url).pathname === "/api/search";
  },
  getColumnValues(entry) {
    const url = new URL(entry.request.url);
    return { search_query: url.searchParams.get("q") || "" };
  },
  getCustomTabs(entry) {
    return [{
      name: "Search data",
      getFields(entry) {
        const json = context.getJsonContent(entry.response.content);
        return json
          ? [{ type: "json", label: "Response", value: json, options: { searchEnabled: true } }]
          : [{ type: "text", label: "Response", value: entry.response.content.text || "(empty)" }];
      },
    }];
  },
});
```

The example uses the built-in JSON helper when available and falls back to showing the response text. If a parser does not need a custom column or tab, return an empty `getColumnsInfo` array or an empty array from `getCustomTabs`.

### Adding and managing parsers

- **Create in the app:** Select **+ New parser** in the parser area. The editor provides a starter template, JavaScript syntax highlighting and HAR-related completions. Save the parser to register it.
- **Load an existing parser:** Drag one or more `.js` files into the parser area. You can also download an edited parser from the editor.
- **Edit or remove:** Use the controls shown next to each loaded parser. Parser source and registrations are stored in local storage for the current browser profile.
- **Bundle with an example:** Add a subdirectory under `examples/` containing a `.har` file and any related `.js` parser files. The Vite examples plugin discovers these files and includes them in the built app.

## Local development

### Requirements

- Node.js 20 or later (the GitHub Pages deployment workflow uses Node.js 20)
- npm

### Install and run

```sh
npm ci
npm run dev
```

Vite prints the local development URL in the terminal. Open that URL in a browser to use the app.

### Build and preview

```sh
npm run build
npm run preview
```

`npm run build` runs the TypeScript project build and creates the static production site in `dist/`. `npm run preview` serves that built site locally. The project is configured for deployment under the `/FlexiHarAnalyzer/` GitHub Pages path; the GitHub Actions workflow builds and deploys it when changes are pushed to `master`.

## License

FlexiHarAnalyzer is distributed under the [MIT License](LICENSE). Copyright (c) 2024 Max Chodorowski.
