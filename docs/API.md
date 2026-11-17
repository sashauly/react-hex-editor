# Public API

The default export is the styled automatic editor. `UnstyledHexEditor` is the automatic editor with inline layout. `BaseHexEditor` and `UnstyledBaseHexEditor` require explicit geometry.

Start with **AutoSizeHexEditorProps**, **HexEditorProps**, and **HexEditorHandle** for the component contract. **BaseHexEditorProps** contains their shared options. All four components forward the same handle. The styled wrappers also support styled-components v5's theme and polymorphic component options; their generated wrapper signatures are secondary to these prop interfaces.

See the [guide and live demo](/react-hex-editor/index.html#guide) for controlled writes, selection, sizing, themes and known behavior limitations. This is unreleased development documentation for the independent sashauly fork; the upstream npm package is a different distribution.
