import exampleSource from './Example.tsx?raw';
import React, { useRef, useState } from "react";
import HexEditor, {
  BaseHexEditor,
  UnstyledHexEditor,
  UnstyledBaseHexEditor,
} from "react-hex-editor";
import type { HexEditorHandle } from "react-hex-editor";
import oneDarkPro from "react-hex-editor/themes/oneDarkPro";

const initialData = () => Uint8Array.from({ length: 259 }, (_, i) => i & 255);

// The mutable example deliberately exercises caller-owned buffers plus nonce.
function overwrite(
  buffer: Uint8Array | number[],
  offset: number,
  value: number,
) {
  buffer[offset] = value;
}

/** The live guide example also serves as the packaged React/browser fixture. */
export default function App() {
  const [data, setData] = useState<Uint8Array | number[]>(initialData);
  const [nonce, setNonce] = useState(0);
  const [fixedColumns, setFixedColumns] = useState(false);
  const [mutable, setMutable] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [ascii, setAscii] = useState(true);
  const [labels, setLabels] = useState(true);
  const [variant, setVariant] = useState("styled-auto");
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [lastWrite, setLastWrite] = useState("none");
  const [focus, setFocus] = useState("blurred");
  const [width, setWidth] = useState(720);
  const editor = useRef<HexEditorHandle>(null);
  const onSetValue = (offset: number, value: number) => {
    setLastWrite(`${offset}:${value}`);
    if (mutable) {
      overwrite(data, offset, value);
      setNonce((n) => n + 1);
    } else {
      setData(previous => {
        const copy = previous.slice();
        copy[offset] = value;
        return copy;
      });
    }
  };
  const geometry = { columns: 16, rows: 10, width, height: 260, rowHeight: 24 };
  const editorProps = {
    key: variant, ref: editor, data, nonce, showAscii: ascii, showColumnLabels: labels,
    showRowLabels: labels, readOnly, onSetValue,
    onFocus: () => setFocus('focused'), onBlur: () => setFocus('blurred'),
    ...(fixedColumns ? { columns: 16, rowHeight: 35 } : {}),
    ...(dark ? { theme: { hexEditor: oneDarkPro } } : {}),
  };
  return (
    <>
      <header>
        <a href="#">React Hex Editor</a>
        <nav>
          <a href="#demo">Demo</a>
          <a href="#guide">Guide</a>
          <a href="./api/">API</a>
          <a href="https://github.com/sashauly/react-hex-editor">GitHub</a>
        </nav>
      </header>
      <main>
        <p className="eyebrow">
          Maintained fork · Development documentation · unreleased
        </p>
        <h1>
          Binary data,
          <br />
          within reach.
        </h1>
        <p className="intro">
          A virtualized hex and ASCII editor for React. Keep control of your
          bytes, choose your styling, and render only what is visible.
        </p>
        <section id="demo">
          <h2>Try the editor</h2>
          <p>
            Click a byte and type two hexadecimal digits. Press Tab to enter
            ASCII. Drag or Shift+arrow to select; Ctrl/Cmd+C copies the
            selection.
          </p>
          <div className="controls">
            <label><input type="checkbox" checked={fixedColumns} onChange={e => setFixedColumns(e.target.checked)} />Fixed columns</label>
            <label>
              Component{" "}
              <select
                aria-label="Component"
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
              >
                <option value="styled-auto">Styled · automatic</option>
                <option value="styled-base">Styled · explicit</option>
                <option value="unstyled-auto">Unstyled · automatic</option>
                <option value="unstyled-base">Unstyled · explicit</option>
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={mutable}
                onChange={(e) => setMutable(e.target.checked)}
              />
              Mutable data
            </label>
            <label>
              <input
                type="checkbox"
                checked={readOnly}
                onChange={(e) => setReadOnly(e.target.checked)}
              />
              Read only
            </label>
            <label>
              <input
                type="checkbox"
                checked={ascii}
                onChange={(e) => setAscii(e.target.checked)}
              />
              ASCII
            </label>
            <label>
              <input
                type="checkbox"
                checked={labels}
                onChange={(e) => setLabels(e.target.checked)}
              />
              Labels
            </label>
            <label>
              <input
                type="checkbox"
                checked={dark}
                onChange={(e) => setDark(e.target.checked)}
              />
              Dark theme
            </label>
            <label>
              Width{" "}
              <input
                aria-label="Width"
                type="range"
                min="360"
                max="900"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
              />
            </label>
          </div>
          <div
            className="editor-frame"
            data-testid="editor"
            style={{ width, maxWidth: "100%", height: 260 }}
          >
            {mounted && (variant === 'styled-auto' ? <HexEditor {...editorProps} />
              : variant === 'unstyled-auto' ? <UnstyledHexEditor {...editorProps} />
              : variant === 'styled-base' ? <BaseHexEditor {...editorProps} {...geometry} />
              : <UnstyledBaseHexEditor {...editorProps} {...geometry} />)}
          </div>
          <div className="controls actions">
            <button onClick={() => editor.current?.focus()}>
              Focus editor
            </button>
            <button onClick={() => editor.current?.blur()}>Blur editor</button>
            <button
              onClick={() =>
                editor.current?.setSelectionRange(0, 4, null, true)
              }
            >
              Select first four
            </button>
            <button
              onClick={() =>
                editor.current?.scrollToItem(
                  Math.ceil(data.length / 16) - 1,
                  "end",
                )
              }
            >
              Scroll to end
            </button>
            <button onClick={() => editor.current?.scrollTo(0)}>
              Scroll to start
            </button>
            <button onClick={() => editor.current?.setValue(0, 255)}>
              Write first byte
            </button>
            <button
              onClick={() => {
                setData(initialData());
                setLastWrite("none");
              }}
            >
              Reset
            </button>
            <button onClick={() => setData(new Uint8Array(1_000_001))}>
              Large buffer
            </button>
            <button onClick={() => setData(Uint8Array.from([65,66,67,68,69,70,71,72]))}>ASCII sample</button>
            <button onClick={() => setData(Array.from(data))}>
              Use number array
            </button>
            <button onClick={() => setMounted((v) => !v)}>
              {mounted ? "Unmount" : "Mount"}
            </button>
          </div>
          <div className="status" aria-live="polite">
            <output data-testid="write">{lastWrite}</output> ·{" "}
            <output data-testid="focus">{focus}</output> ·{" "}
            <output data-testid="length">{data.length}</output> bytes · first
            bytes{" "}
            <output data-testid="bytes">
              {Array.from(data.slice(0, 8))
                .map((v) => v.toString(16).padStart(2, "0"))
                .join(" ")}
            </output>
          </div>
        </section>
        <section id="guide">
          <h2>Use the maintained fork</h2>
          <p>
            This fork is maintained independently by sashauly, based on Keith
            McKnight’s ISC-licensed React Hex Editor. The upstream npm registry
            package does not install this fork.
          </p>
          <p>Until a fork release exists, build a local installable tarball:</p>
          <pre>
            <code>
              {
                "git clone https://github.com/sashauly/react-hex-editor.git\ncd react-hex-editor\nnvm install && nvm use\nnpm ci\nnpm run package\n# In your application:\nnpm install /path/to/react-hex-editor/artifacts/react-hex-editor-0.3.0.tgz"
              }
            </code>
          </pre>
          <h3>Controlled writes</h3>
          <p>
            The editor requests byte overwrites through{" "}
            <code>onSetValue(offset, value)</code>. You own the data. Replace
            the array to accept an edit, or mutate it and change{" "}
            <code>nonce</code>. Without a parent update, the stored value stays
            unchanged. A hexadecimal byte commits after two digits; navigation
            or Backspace cancels a pending first digit.
          </p>
          <pre>
            <code>{exampleSource}</code>
          </pre>
          <h3>Components and sizing</h3>
          <p>
            The default export is the styled automatic editor.{" "}
            <code>UnstyledHexEditor</code> uses the same measurements with
            inline layout. Give automatic editors a parent with a real width and
            height, or supply columns/rows and measurement overrides.{" "}
            <code>BaseHexEditor</code> and <code>UnstyledBaseHexEditor</code>{" "}
            require columns, rows, width, height and rowHeight. These editors
            use fixed-height virtual rows. <code>overscanCount</code> controls
            rendering beyond the viewport. The final partial row has empty
            cells.
          </p>
          <h3>Selection, refs and clipboard</h3>
          <p>
            All variants forward a <code>HexEditorHandle</code>: focus, blur,
            scrollTo(pixelOffset), scrollToItem(rowIndex, align?),
            setSelectionRange(start, end?, direction?, takeFocus?), and
            setValue(offset, value). Selection ends are exclusive; directions
            are <code>forward</code>, <code>backward</code> or <code>none</code>
            . Arrow, Home/End, Page Up/Down, Shift extension and Ctrl/Cmd+A work
            in the active pane. Copy uses the browser’s native selection in the
            editor’s input: contiguous hex pairs or characters. Paste overwrites
            complete byte pairs in hex mode or characters in ASCII mode, bounded
            by the remaining buffer.
          </p>
          <h3>Mutable data</h3>
          <p>
            For a stable <code>number[]</code> or <code>Uint8Array</code>,
            assign <code>data[offset] = value</code> and increment a numeric
            nonce. Use the Mutable data control above to exercise this path.
            Replacing the data reference works without a nonce.
          </p>
          <h3>Themes and styling hooks</h3>
          <p>
            Install styled-components ^5.3.11 alongside React. The styled
            variants use a default light theme; pass{" "}
            <code>{"theme={{ hexEditor: oneDarkPro }}"}</code> after importing{" "}
            <code>oneDarkPro</code> from{" "}
            <code>react-hex-editor/themes/oneDarkPro</code>. A ThemeProvider can
            supply the same shape. Custom theme keys fall back to defaults.
            Unstyled variants supply inline layout; pass{" "}
            <code>{"inlineStyles={{}}"}</code> to own layout entirely, or
            override individual entries such as byte, row and editor. The
            classNames prop replaces the hook map; preserve all keys you still
            need. Standard hooks include byteValue, asciiValue, hexEditorRow,
            cursor, selection, currentRow and currentColumn. Custom classes
            require matching CSS. <code>formatValue</code> changes character
            display; showAscii/showColumnLabels/showRowLabels toggle sections.
            inputStyle and measureStyle customize hidden input/measurement
            elements, so preserve their interaction and geometry.
          </p>
          <h3>Support contract</h3>
          <p>
            React 16.8.6 through 18, styled-components 5.3.11, TypeScript
            declarations for 5.6.2 and newer, and current Chrome/Edge, Firefox
            and Safari. CJS and ESM package entries and documented theme paths
            are retained. No IE11 support. Producer commands use Node
            26.13.1/npm 11.20.0 and TypeScript 6.
          </p>
          <h3>Known limitations</h3>
          <p>
            The existing readOnly prop blocks keyboard edits; paste and
            imperative setValue can still request writes. Enforce write policy
            in your callback. Selected-range edits use the cursor endpoint
            rather than range replacement. Hex paste discards non-hex
            characters/unpaired nibbles and truncates at the data end; it does
            not report rejected input. ASCII input follows the legacy key map
            and paste can emit values above 255. Empty data and Backspace at the
            start can produce invalid offsets. Validate callback bounds. Cut
            does not remove source bytes. Structural insertion/deletion, undo
            history and search are deferred; modernization preserves these
            existing boundaries.
          </p>
        </section>
      </main>
      <footer>
        ISC © Keith McKnight · Independently maintained fork by sashauly ·
        Development documentation
      </footer>
    </>
  );
}
