import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HexEditor, {
  BaseHexEditor,
  UnstyledBaseHexEditor,
  UnstyledHexEditor,
} from "../src";
import oneDarkPro from "../src/themes/oneDarkPro";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let container;
let root;
let ref;
let onSetValue;
const dimensions = {
  columns: 4,
  rows: 4,
  width: 240,
  height: 80,
  rowHeight: 20,
};

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  ref = React.createRef();
  onSetValue = vi.fn();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    () => ({
      width: 20,
      height: 20,
      top: 0,
      left: 0,
      right: 20,
      bottom: 20,
      x: 0,
      y: 0,
      toJSON() {},
    }),
  );
});
afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.restoreAllMocks();
});
function render(props = {}, Component = UnstyledBaseHexEditor) {
  act(() => {
    root.render(
      <React.StrictMode><Component
        {...dimensions}
        data={[0x11, 0x22, 0x33, 0x44, 0x55]}
        showAscii
        onSetValue={onSetValue}
        ref={ref}
        {...props}
      /></React.StrictMode>,
    );
  });
}
const input = () => container.querySelector("input");
const byte = (offset) =>
  container.querySelector(`.hexEditorBody .byteValue[data-offset="${offset}"]`);
function mouse(node, type, options = {}) {
  act(() => {
    node.dispatchEvent(
      new MouseEvent(type, { bubbles: true, button: 0, ...options }),
    );
  });
}
function key(code, options = {}) {
  act(() => {
    input().dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        keyCode: code,
        which: code,
        ...options,
      }),
    );
  });
}
function paste(text) {
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", {
    value: { getData: () => text },
  });
  act(() => {
    input().dispatchEvent(event);
  });
  return event;
}

describe("public editor behavior", () => {
  for (const [name, Component] of Object.entries({
    HexEditor,
    BaseHexEditor,
    UnstyledBaseHexEditor,
    UnstyledHexEditor,
  })) {
    it(`${name} renders and forwards the complete imperative handle`, () => {
      render({}, Component);
      expect(input()).toBeTruthy();
      expect(Object.keys(ref.current).sort()).toEqual([
        "blur",
        "focus",
        "scrollTo",
        "scrollToItem",
        "setSelectionRange",
        "setValue",
      ]);
      act(() => ref.current.focus());
      expect(document.activeElement).toBe(input());
    });
  }
  it("clicks a byte and commits only after two hex nibbles", () => {
    render();
    mouse(byte(1), "click");
    key(65); // A
    expect(onSetValue).not.toHaveBeenCalled();
    expect(byte(1).textContent).toBe("a2");
    key(66);
    expect(onSetValue.mock.calls).toEqual([[1, 0xab]]);
    expect(byte(2).classList.contains("cursor")).toBe(true);
  });
  it("cancels a pending nibble with backspace or navigation", () => {
    render();
    key(65);
    key(8);
    expect(byte(0).textContent).toBe("11");
    key(65);
    key(39);
    key(66);
    expect(onSetValue).not.toHaveBeenCalled();
    expect(byte(1).textContent).toBe("b2");
  });
  it("switches to ASCII using Tab and emits shifted characters", () => {
    render();
    key(9);
    key(65);
    key(66, { shiftKey: true });
    expect(onSetValue.mock.calls).toEqual([
      [0, 97],
      [1, 66],
    ]);
  });
  it("extends selection with Shift and exposes the native copy text", () => {
    render();
    mouse(byte(1), "click");
    key(39, { shiftKey: true });
    key(39, { shiftKey: true });
    expect(input().value).toBe("2233");
    expect(input().selectionStart).toBe(0);
    expect(input().selectionEnd).toBe(4);
    mouse(byte(4), "click", { shiftKey: true });
    expect(input().value).toBe("223344");
  });
  for (const [start, end] of [
    [0, 2],
    [2, 0],
  ]) {
    it(`drags from ${start} to ${end}`, () => {
      render();
      mouse(byte(start), "mousedown");
      mouse(byte(end), "mousemove");
      mouse(window, "mouseup");
      expect(input().value).toBe("112233");
      expect(container.querySelectorAll(".byteValue.selection")).toHaveLength(
        3,
      );
    });
  }
  it("selects all and navigates by rows, home and end", () => {
    render();
    key(65, { ctrlKey: true });
    expect(input().value).toBe("1122334455");
    key(36);
    expect(byte(4).classList.contains("cursor")).toBe(true);
    key(38);
    expect(byte(0).classList.contains("cursor")).toBe(true);
    key(35);
    expect(byte(3).classList.contains("cursor")).toBe(true);
  });
  it("keeps read-only navigation, selection and copy while blocking keyboard writes", () => {
    render({ readOnly: true });
    key(65);
    key(66);
    key(8);
    key(46);
    key(9);
    key(65);
    expect(onSetValue).not.toHaveBeenCalled();
    key(39);
    key(39, { shiftKey: true });
    expect(input().value).toBe('"');
  });
  for (const pane of ["Hex", "ASCII"]) {
    for (const selected of [false, true]) {
      it(`blocks read-only ${pane} paste ${selected ? "with" : "without"} a selection`, () => {
        render({ readOnly: true, data: [0x11, 0x22] });
        act(() => ref.current.focus());
        if (pane === "ASCII") key(9);
        if (selected) key(39, { shiftKey: true });
        const firstByteText = pane === "Hex" ? "11" : "\x11";
        const copyText = selected ? firstByteText : "";
        expect(input().value).toBe(copyText);

        const event = paste("AB");

        expect(onSetValue).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBe(true);
        expect(document.activeElement).toBe(input());
        expect(input().value).toBe(copyText);
        expect(input().selectionStart).toBe(0);
        expect(input().selectionEnd).toBe(copyText.length);
        // Selection can still extend from the original cursor after a rejected paste.
        key(39, { shiftKey: true });
        const selectedText = pane === "Hex" ? "1122" : '\x11"';
        expect(input().value).toBe(selected ? selectedText : firstByteText);
      });
    }
    it(`honors readOnly prop changes for ${pane} paste`, () => {
      render();
      if (pane === "ASCII") key(9);
      for (const readOnly of [false, true, false]) {
        render({ readOnly });
        act(() => ref.current.setSelectionRange(0));
        onSetValue.mockClear();
        paste("AB");
        const expectedWrites = pane === "Hex" ? [[0, 0xab]] : [[0, 65], [1, 66]];
        expect(onSetValue.mock.calls).toEqual(readOnly ? [] : expectedWrites);
      }
    });
  }
  it("pastes complete hex bytes and truncates to the remaining data", () => {
    render();
    mouse(byte(3), "click");
    paste("ab cd ef");
    expect(onSetValue.mock.calls).toEqual([
      [3, 0xab],
      [4, 0xcd],
    ]);
  });
  it("copies and pastes ASCII in the active pane", () => {
    render({ data: [65, 66, 67] });
    key(9);
    act(() => ref.current.setSelectionRange(0, 2));
    expect(input().value).toBe("AB");
    act(() => ref.current.setSelectionRange(0));
    paste("xy");
    expect(onSetValue.mock.calls).toEqual([
      [0, 120],
      [1, 121],
    ]);
  });
  it("refreshes focus/write callbacks and data after prop replacement", () => {
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    render({ onFocus, onBlur });
    act(() => ref.current.focus());
    act(() => ref.current.blur());
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
    const updated = vi.fn();
    render({ data: [0xaa], onSetValue: updated });
    expect(byte(0).textContent).toBe("aa");
    act(() => ref.current.setValue(0, 0xbb));
    expect(updated).toHaveBeenCalledWith(0, 0xbb);
    expect(onSetValue).not.toHaveBeenCalled();
  });
  for (const data of [new Array(100).fill(0), new Uint8Array(100)]) {
    it(`refreshes mutable ${data.constructor.name} rows using nonce`, () => {
      render({ data, nonce: 0 });
      data[40] = 0xfe;
      render({ data, nonce: 1 });
      act(() => ref.current.scrollToItem(10, "start"));
      expect(byte(40).textContent).toBe("fe");
    });
  }
  it("bounds large rendering and scrolls through the imperative handle", () => {
    render({ data: new Uint8Array(1_000_001) });
    expect(container.querySelectorAll(".hexEditorRow").length).toBeLessThan(20);
    act(() => ref.current.scrollTo(2000));
    expect(byte(400)).toBeTruthy();
    act(() => ref.current.scrollToItem(250000, "end"));
    expect(byte(1000000)).toBeTruthy();
    expect(byte(1000001).classList.contains("invalid")).toBe(true);
  });
  it("retains inline layout, overrides, formatting and visibility controls", () => {
    render({
      inlineStyles: { editor: { display: "flex" }, byte: { width: 25 } },
      formatValue: () => "!",
    });
    expect(byte(0).style.width).toBe("25px");
    expect(container.querySelector(".asciiValue").textContent.trim()).toBe("!");
    render({ showAscii: false, showColumnLabels: true, showRowLabels: true });
    expect(container.querySelector(".asciiValue")).toBeNull();
    expect(container.querySelector(".hexEditorHeader")).toBeTruthy();
    expect(container.querySelector(".offsetLabel")).toBeTruthy();
  });
  it("supports a custom theme without losing styling class hooks", () => {
    render({ theme: { hexEditor: oneDarkPro } }, BaseHexEditor);
    expect(byte(0).classList.contains("byteValue")).toBe(true);
    expect(document.head.textContent).toContain(oneDarkPro.colorBackground);
  });
});
