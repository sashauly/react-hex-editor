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
const pasteErrorMessage = "Invalid hex input. Use complete byte pairs, optionally separated by whitespace—for example, AB CD.";
const pasteOverflowMessage = "Paste exceeds the remaining buffer length.";

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
  for (const direction of ["forward", "backward"]) {
    for (const pane of ["Hex", "ASCII"]) {
      it(`${pane} typing overwrites from the start of a ${direction} range`, () => {
        render({ data: [0x11, 0x22, 0x33, 0x44] });
        if (pane === "ASCII") key(9);
        act(() => ref.current.setSelectionRange(0, 4, direction));
        key(65, { shiftKey: pane === "ASCII" });
        if (pane === "Hex") {
          expect(onSetValue).not.toHaveBeenCalled();
          expect(byte(0).textContent).toBe("a1");
          key(66);
        }
        expect(onSetValue.mock.calls).toEqual([[0, pane === "Hex" ? 0xab : 65]]);
        expect(byte(1).classList.contains("cursor")).toBe(true);
        expect(input().value).toBe("");
      });

      for (const text of ["AB", "ABCDEF"]) {
        it(`${pane} paste ${text} starts at a ${direction} range's lower bound`, () => {
          render({ data: [0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88] });
          if (pane === "ASCII") key(9);
          act(() => ref.current.setSelectionRange(1, 3, direction));
          paste(text);
          const values = pane === "Hex"
            ? text.match(/../g).map(value => parseInt(value, 16))
            : Array.from(text, value => value.charCodeAt(0));
          expect(onSetValue.mock.calls).toEqual(values.map((value, i) => [i + 1, value]));
          expect(byte(1 + values.length).classList.contains("cursor")).toBe(true);
        });
      }
    }
    for (const code of [8, 46]) {
      for (const shiftKey of [false, true]) {
        it(`key ${code} zeroes a ${direction} range (Shift: ${shiftKey})`, () => {
          render();
          act(() => ref.current.setSelectionRange(1, 4, direction));
          key(code, { shiftKey });
          expect(onSetValue.mock.calls).toEqual([[1, 0], [2, 0], [3, 0]]);
          expect(byte(1).classList.contains("cursor")).toBe(true);
          expect(input().value).toBe("");
        });
      }
    }
  }
  it("Select All then typing preserves buffer length and unedited bytes", () => {
    const data = [0x11, 0x22, 0x33, 0x44];
    render({ data, onSetValue: (offset, value) => { data[offset] = value; } });
    key(65, { ctrlKey: true });
    key(65);
    key(66);
    expect(data).toEqual([0xab, 0x22, 0x33, 0x44]);
  });
  for (const code of [8, 46]) {
    it(`Select All then key ${code} fills the buffer with zeroes`, () => {
      const data = [0x11, 0x22, 0x33, 0x44];
      render({ data, onSetValue: (offset, value) => { data[offset] = value; } });
      key(65, { ctrlKey: true });
      key(code);
      expect(data).toEqual([0, 0, 0, 0]);
    });
  }
  it("Backspace at zero never calls the consumer with a negative offset", () => {
    render();
    key(8);
    expect(onSetValue).not.toHaveBeenCalled();
    expect(byte(0).classList.contains("cursor")).toBe(true);
  });
  for (const [code, shiftKey, offset, next] of [
    [8, false, 1, 1], [46, false, 2, 3],
    [8, true, 2, 2], [46, true, 2, 2],
  ]) {
    it(`preserves collapsed-cursor behavior for key ${code} (Shift: ${shiftKey})`, () => {
      render();
      act(() => ref.current.setSelectionRange(2));
      key(code, { shiftKey });
      expect(onSetValue.mock.calls).toEqual([[offset, 0]]);
      expect(byte(next).classList.contains("cursor")).toBe(true);
    });
  }
  it("keeps selected bytes unchanged when read-only", () => {
    render({ readOnly: true });
    act(() => ref.current.setSelectionRange(0, 5));
    key(65);
    key(66);
    key(8);
    key(46);
    key(9);
    key(65);
    expect(onSetValue).not.toHaveBeenCalled();
    expect(container.querySelectorAll(".byteValue.selection")).toHaveLength(5);
  });
  it("keeps the cursor writable after a collapsed selection at the exclusive end", () => {
    render();
    act(() => ref.current.setSelectionRange(5));
    expect(byte(4).classList.contains("cursor")).toBe(true);
    paste("ab");
    expect(onSetValue.mock.calls).toEqual([[4, 0xab]]);
  });
  for (const data of [[], [0x11], new Uint8Array(0), new Uint8Array([0x11])]) {
    it(`never emits out-of-bounds writes for ${data.length} bytes`, () => {
      render({ data });
      act(() => {
        for (const offset of [-1, data.length, 0.5, NaN, Infinity]) {
          ref.current.setValue(offset, 0xff);
        }
      });
      expect(onSetValue).not.toHaveBeenCalled();
      if (data.length) return;
      key(65, { ctrlKey: true });
      key(46);
      key(8);
      key(65);
      key(66);
      paste("ab cd");
      key(9);
      key(65);
      paste("AB");
      expect(onSetValue).not.toHaveBeenCalled();
    });
  }
  it("checks ref write bounds against the latest buffer", () => {
    render();
    const setValue = ref.current.setValue;
    render({ data: [0x11] });
    act(() => {
      setValue(4, 0xff);
      setValue(0, 0xab);
    });
    expect(onSetValue.mock.calls).toEqual([[0, 0xab]]);
  });
  it("cancels a range's pending first nibble before clearing any bytes", () => {
    render();
    act(() => ref.current.setSelectionRange(0, 5));
    key(65);
    key(8);
    expect(onSetValue).not.toHaveBeenCalled();
    expect(byte(0).textContent).toBe("11");
    key(65);
    key(66);
    expect(onSetValue.mock.calls).toEqual([[0, 0xab]]);
  });
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
    it(`${name} forwards the current paste rejection callback`, () => {
      const onPasteError = vi.fn();
      render({ onPasteError }, Component);
      paste("GG AB C");
      expect(onPasteError).toHaveBeenCalledExactlyOnceWith(new Error(pasteErrorMessage));
      const updated = vi.fn();
      render({ onPasteError: updated }, Component);
      paste("AB C");
      expect(updated).toHaveBeenCalledExactlyOnceWith(new Error(pasteErrorMessage));
      expect(onPasteError).toHaveBeenCalledTimes(1);
      expect(onSetValue).not.toHaveBeenCalled();
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
  it("pastes complete hex bytes that exactly fit the remaining data", () => {
    render();
    mouse(byte(3), "click");
    paste("ab cd");
    expect(onSetValue.mock.calls).toEqual([
      [3, 0xab],
      [4, 0xcd],
    ]);
  });
  it.each(["ABcd00", "ab CD 00", " \tab\r\nCD\t00\n"])(
    "accepts complete hex byte pairs: %j", (text) => {
      const onPasteError = vi.fn();
      render({ onPasteError });
      const event = paste(text);
      expect(event.defaultPrevented).toBe(true);
      expect(onSetValue.mock.calls).toEqual([[0, 0xab], [1, 0xcd], [2, 0]]);
      expect(onPasteError).not.toHaveBeenCalled();
      expect(byte(3).classList.contains("cursor")).toBe(true);
    },
  );
  it.each(["GG AB C", " \tGG AB C\n", "AB C", "A", "A B", "AB C D", "0xAB", "AB,CD", "AB-CD", "AB zz"])(
    "rejects the entire malformed hex paste: %j", (text) => {
      const onPasteError = vi.fn();
      render({ onPasteError });
      act(() => ref.current.setSelectionRange(1, 3, "backward", true));
      const selectionClassName = byte(1).className;
      const event = paste(text);
      expect(onSetValue).not.toHaveBeenCalled();
      expect(onPasteError).toHaveBeenCalledExactlyOnceWith(new Error(pasteErrorMessage));
      expect(onPasteError.mock.calls[0][0]).toBeInstanceOf(Error);
      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(input());
      expect(input().value).toBe("2233");
      expect(input().selectionStart).toBe(0);
      expect(input().selectionEnd).toBe(4);
      expect(byte(1).className).toBe(selectionClassName);
      expect(container.querySelectorAll(".byteValue.selection")).toHaveLength(2);
    },
  );
  it("validates the whole paste before checking overflow", () => {
    const onPasteError = vi.fn();
    render({ onPasteError });
    act(() => ref.current.setSelectionRange(4));
    paste("AB CD Z");
    expect(onSetValue).not.toHaveBeenCalled();
    expect(onPasteError).toHaveBeenCalledWith(new Error(pasteErrorMessage));
  });
  it.each(["", " \r\n\t"])("leaves selection unchanged for an empty hex paste: %j", (text) => {
    const onPasteError = vi.fn();
    render({ onPasteError });
    act(() => ref.current.setSelectionRange(1, 3));
    paste(text);
    expect(onSetValue).not.toHaveBeenCalled();
    expect(onPasteError).not.toHaveBeenCalled();
    expect(input().value).toBe("2233");
    expect(container.querySelectorAll(".byteValue.selection")).toHaveLength(2);
  });
  it("preserves a pending nibble on rejection without requiring an error callback", () => {
    render();
    key(65);
    paste("GG AB C");
    expect(onSetValue).not.toHaveBeenCalled();
    expect(byte(0).textContent).toBe("a1");
    key(66);
    expect(onSetValue.mock.calls).toEqual([[0, 0xab]]);
  });
  it("does not validate ASCII paste or report errors for read-only paste", () => {
    const onPasteError = vi.fn();
    render({ onPasteError, data: new Uint8Array(8) });
    key(9);
    paste("GG AB C");
    expect(onSetValue.mock.calls).toEqual([[0, 71], [1, 71], [2, 32], [3, 65], [4, 66], [5, 32], [6, 67]]);
    onSetValue.mockClear();
    key(9);
    render({ onPasteError, readOnly: true });
    paste("GG AB C");
    expect(onSetValue).not.toHaveBeenCalled();
    expect(onPasteError).not.toHaveBeenCalled();
  });
  for (const pane of ["Hex", "ASCII"]) {
    for (const direction of ["forward", "backward"]) {
      it(`rejects a one-byte ${pane} overflow from a ${direction} selection without partial writes`, () => {
        const onPasteError = vi.fn();
        render({ onPasteError });
        if (pane === "ASCII") key(9);
        act(() => ref.current.setSelectionRange(1, 3, direction, true));
        const copyText = input().value;
        const selectionClasses = [byte(1).className, byte(2).className];
        const event = paste(pane === "Hex" ? "AA BB CC DD EE" : "ABCDE");
        expect(event.defaultPrevented).toBe(true);
        expect(onSetValue).not.toHaveBeenCalled();
        expect(onPasteError).toHaveBeenCalledExactlyOnceWith(new Error(pasteOverflowMessage));
        expect(onPasteError.mock.calls[0][0]).toBeInstanceOf(Error);
        expect(document.activeElement).toBe(input());
        expect(input().value).toBe(copyText);
        expect(input().selectionStart).toBe(0);
        expect(input().selectionEnd).toBe(copyText.length);
        expect([byte(1).className, byte(2).className]).toEqual(selectionClasses);
      });
    }
    for (const data of [[], new Uint8Array(0)]) {
      it(`rejects ${pane} paste into empty ${data.constructor.name} data`, () => {
        const onPasteError = vi.fn();
        render({ data, onPasteError });
        if (pane === "ASCII") key(9);
        paste(pane === "Hex" ? "AA" : "A");
        expect(onSetValue).not.toHaveBeenCalled();
        expect(onPasteError).toHaveBeenCalledExactlyOnceWith(new Error(pasteOverflowMessage));
      });
    }
    it(`accepts an exact-fit ${pane} paste at EOF`, () => {
      const onPasteError = vi.fn();
      render({ onPasteError });
      if (pane === "ASCII") key(9);
      act(() => ref.current.setSelectionRange(4));
      paste(pane === "Hex" ? "AA" : "A");
      expect(onSetValue.mock.calls).toEqual([[4, pane === "Hex" ? 0xaa : 65]]);
      expect(onPasteError).not.toHaveBeenCalled();
      expect(byte(4).classList.contains("cursor")).toBe(true);
    });
  }
  it("preserves a pending nibble when an oversized paste is rejected without a callback", () => {
    render();
    act(() => ref.current.setSelectionRange(4));
    key(65);
    paste("AA BB CC");
    expect(onSetValue).not.toHaveBeenCalled();
    expect(byte(4).textContent).toBe("a5");
    key(66);
    expect(onSetValue.mock.calls).toEqual([[4, 0xab]]);
  });
  it("checks paste capacity against the current buffer after replacement", () => {
    const onPasteError = vi.fn();
    render({ onPasteError });
    render({ data: [0x11], onPasteError });
    paste("AA BB");
    expect(onSetValue).not.toHaveBeenCalled();
    expect(onPasteError).toHaveBeenCalledExactlyOnceWith(new Error(pasteOverflowMessage));
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
