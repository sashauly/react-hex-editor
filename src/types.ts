import {
  Align,
  ListOnItemsRenderedProps,
} from 'react-window';

import {
  EDIT_MODE_ASCII,
  EDIT_MODE_HEX,
  SELECTION_DIRECTION_BACKWARD,
  SELECTION_DIRECTION_FORWARD,
  SELECTION_DIRECTION_NONE,
} from './constants';

export type EditModeType = (
  typeof EDIT_MODE_ASCII
  | typeof EDIT_MODE_HEX
);

export type SelectionDirectionType = (
  typeof SELECTION_DIRECTION_FORWARD
  | typeof SELECTION_DIRECTION_BACKWARD
  | typeof SELECTION_DIRECTION_NONE
);

export type SetSelectionBoundaryCallback = (
  offset: number,
  editMode?: EditModeType,
  e?: React.MouseEvent,
) => void;

export type SetSelectionRangeCallback = (
  start: number | null,
  end?: number | null,
  direction?: SelectionDirectionType | null,
  takeFocus?: boolean,
) => void;

export type ValueFormatter = (value: number) => string | JSX.Element | null;

export type HexEditorBodyChildren = JSX.Element | null | (() => JSX.Element);

/** Shared display and controlled editing options for all four components. */
export interface BaseHexEditorProps {
  asciiPlaceholder?: string | JSX.Element | null,
  autoFocus?: boolean,
  children?: HexEditorBodyChildren,
  className?: string,
  classNames?: HexEditorClassNames,
  /** Caller-owned bytes. Mutating this buffer requires updating `nonce`. */
  data: Uint8Array | number[],
  formatValue?: ValueFormatter,
  inlineStyles?: HexEditorInlineStyles,
  highlightColumn?: boolean,
  inputStyle?: React.CSSProperties | null,
  /** Change this value after mutating an existing data buffer. */
  nonce?: number | string,
  onBlur?: (e: React.FocusEvent) => void,
  onFocus?: (e: React.FocusEvent) => void,
  /** Called once with an Error containing a default English message when hex paste is rejected.
   * Hex accepts complete byte pairs (case-insensitive), with optional whitespace
   * between pairs and at the edges. Invalid characters or incomplete pairs reject
   * the entire paste without changing bytes, selection or a pending nibble.
   * Empty/whitespace-only hex paste is ignored. ASCII and read-only paste do not
   * call this callback. Valid paste is bounded by the remaining buffer length.
   */
  onPasteError?: (error: Error) => void,
  /** Requests an in-bounds byte overwrite; the caller must accept it into data and re-render.
   * Range edits start at the lower bound. Delete/Backspace zero the selected bytes.
   * Editing never inserts or removes bytes.
   */
  onSetValue?: (offset: number, value: number) => void,
  onItemsRendered?: (props: ListOnItemsRenderedProps) => void,
  overscanCount?: number,
  /** Blocks keyboard and paste writes. Imperative setValue can still request writes. */
  readOnly?: boolean,
  showAscii?: boolean,
  showColumnLabels?: boolean,
  showRowLabels?: boolean,
  style?: React.CSSProperties | null,
  tabIndex?: number,
};

/** Optional dimensions are inferred from measurements and the sized parent. */
export interface AutoSizeHexEditorProps extends BaseHexEditorProps {
  asciiWidth?: number,
  byteWidth?: number,
  columns?: number,
  gutterWidth?: number,
  height?: number,
  labelWidth?: number,
  measureStyle?: React.CSSProperties | null,
  rowHeight?: number,
  rows?: number,
  scrollbarWidth?: number,
  width?: number,
};

/** Explicit geometry required by BaseHexEditor and UnstyledBaseHexEditor. */
export interface HexEditorProps extends BaseHexEditorProps {
  columns: number,
  height: number,
  rowHeight: number,
  rows: number,
  width: number,
};

/** Forwarded ref shared by styled, unstyled, automatic and explicit editors. */
export interface HexEditorHandle {
  blur(): void,
  focus(): void,
  scrollTo(scrollTop: number): void,
  scrollToItem(rowIndex: number, align?: Align): void,
  /** Select a range with an exclusive end. A collapsed range is the cursor.
   * Typing and paste overwrite from the lower bound, regardless of direction.
   */
  setSelectionRange(
    start: number | null,
    end?: number | null,
    direction?: SelectionDirectionType | null,
    takeFocus?: boolean,
  ): void,
  /** Request an overwrite. Offsets outside data or non-integer offsets are ignored. */
  setValue(offset: number, value: number): void,
};

export interface HexEditorClassNames {
  ascii?: string,
  asciiHeader?: string,
  asciiValues?: string,
  body?: string,
  byte?: string,
  byteHeader?: string,
  byteValues?: string,
  currentColumn?: string,
  currentRow?: string,
  cursor?: string,
  cursorHigh?: string,
  cursorLow?: string,
  editAscii?: string,
  editHex?: string,
  even?: string,
  gutter?: string,
  gutterHeader?: string,
  header?: string,
  highlight?: string,
  invalid?: string,
  notFocused?: string,
  nybbleHigh?: string,
  nybbleLow?: string,
  odd?: string,
  offsetLabel?: string,
  offsetLabelHeader?: string,
  row?: string,
  rowHeader?: string,
  selection?: string,
  selectionBackward?: string,
  selectionCursor?: string,
  selectionEnd?: string,
  selectionForward?: string,
  selectionStart?: string,
};

export interface HexEditorInlineStyles {
  ascii?: React.CSSProperties,
  asciiValues?: React.CSSProperties,
  body?: React.CSSProperties,
  byte?: React.CSSProperties,
  byteValues?: React.CSSProperties,
  editor?: React.CSSProperties,
  gutter?: React.CSSProperties,
  header?: React.CSSProperties,
  offsetLabel?: React.CSSProperties,
  row?: React.CSSProperties,
};
