import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import joinClassNames from 'classnames';
import {
  Align,
  ListOnItemsRenderedProps,
  FixedSizeList as List,
} from 'react-window';
import Keycoder from 'keycoder';

import {
  KEY_A,
  KEY_BACK_SPACE,
  KEY_DELETE,
  KEY_DOWN,
  KEY_E,
  KEY_END,
  KEY_HOME,
  KEY_LEFT,
  KEY_PAGE_DOWN,
  KEY_PAGE_UP,
  KEY_RIGHT,
  KEY_TAB,
  KEY_UP,
} from 'keycode-js';

import {
  EditModeType,
  HexEditorEdit,
  HexEditorHandle,
  HexEditorProps,
  HexEditorSelection,
  SelectionDirectionType,
} from '../types';

import {
  EDIT_MODE_ASCII,
  EDIT_MODE_HEX,
  KEY_VALUES,
  SELECTION_DIRECTION_BACKWARD,
  SELECTION_DIRECTION_FORWARD,
  SELECTION_DIRECTION_NONE,
} from '../constants';

import {
  byteToAscii,
  formatHex,
  formatHexByte,
  isMacLike,
} from '../utils';

import CLASS_NAMES from '../constants/classNames';

import INLINE_STYLES, { INPUT_STYLE } from '../constants/inlineStyles';

import HexEditorRow from './HexEditorRow';
import HexEditorContext, { HexEditorContextInterface } from '../contexts/HexEditorContext';
import HexEditorBody from './HexEditorBody';

// Validate trimmed paste text as complete byte pairs with optional whitespace between pairs.
const HEX_PASTE_PATTERN = /^(?:[0-9a-f]{2}\s*)+$/i;
// Extract bytes only after validation so malformed input cannot be silently skipped.
const HEX_BYTE_PATTERN = /[0-9a-f]{2}/gi;

interface HexEditorState {
  cursorOffset: number,
  editMode: EditModeType,
  isFocused: boolean,
  nybbleHigh: number | null,
  nybbleOffset: number,
  overscanStartIndex: number,
  overscanStopIndex: number,
  selectionAnchor: number | null,
  selectionDirection: SelectionDirectionType,
  selectionEnd: number,
  selectionStart: number,
  viewportRowOffset: number,
  visibleStartIndex: number,
  visibleStopIndex: number,
};

interface HexEditorAction {
  cursorOffset?: number,
  editMode?: EditModeType,
  isFocused?: boolean,
  nybbleHigh?: number | null,
  nybbleOffset?: number,
  selectionAnchor?: number | null,
  selectionDirection?: SelectionDirectionType,
  selectionEnd?: number,
  selectionStart?: number,
  viewportRowOffset?: number,
  visibleStartIndex?: number,
  visibleStopIndex?: number,
};

const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const reducer = (
  prevState: HexEditorState,
  mergeState: HexEditorAction,
) => ({ ...prevState, ...mergeState });

const HexEditor: React.ForwardRefRenderFunction<HexEditorHandle, HexEditorProps> = ({
  appliedEdit,
  asciiPlaceholder = <>&nbsp;</>,
  autoFocus = false,
  children,
  className,
  classNames = CLASS_NAMES,
  columns,
  data = [],
  editBehavior,
  formatValue = byteToAscii,
  height,
  highlightColumn = false,
  inlineStyles = INLINE_STYLES,
  inputStyle = INPUT_STYLE,
  nonce,
  onBlur,
  onEdit,
  onFocus,
  onItemsRendered,
  onPasteError,
  onRedo,
  onSelectionChange,
  onSetValue,
  onUndo,
  overscanCount,
  readOnly = false,
  rowHeight,
  rows,
  showAscii = false,
  showColumnLabels = false,
  showRowLabels = false,
  style,
  tabIndex,
  width,
}, ref) => {
  const [state, setState] = useReducer(reducer, {
    cursorOffset: 0,
    editMode: EDIT_MODE_HEX,
    isFocused: false,
    nybbleHigh: null,
    nybbleOffset: 0,
    overscanStartIndex: 0,
    overscanStopIndex: 0,
    selectionAnchor: null,
    selectionDirection: SELECTION_DIRECTION_NONE,
    selectionEnd: 0,
    selectionStart: 0,
    viewportRowOffset: 0,
    visibleStartIndex: 0,
    visibleStopIndex: 0,
  });

  const columnData = useMemo(
    () => new Array(columns).fill(0).map((_v, i) => i),
    [columns],
  );

  const insertMode = editBehavior === 'insert' && !!onEdit;
  const maxCursorOffset = Math.max(0, data.length - (insertMode ? 0 : 1));
  const pendingEdit = useRef<{ edit: HexEditorEdit, length: number } | null>(null);
  const rowListRef = useRef<List>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const stateRef = useRef({
    columns,
    data,
    maxCursorOffset,
    readOnly,
    rows,
    showAscii,
    ...state,
  });

  useBrowserLayoutEffect(() => {
    stateRef.current = {
      columns,
      data,
      maxCursorOffset,
      readOnly,
      rows,
      showAscii,
      ...state,
    };
  }, [columns, data, maxCursorOffset, readOnly, rows, showAscii, state]);

  const blur = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.blur();
    }
  }, []);

  const focus = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(0, inputRef.current.value.length);
    }
  }, []);

  const getSelection = useCallback((): HexEditorSelection => {
    const { selectionStart, selectionEnd, selectionDirection, cursorOffset, editMode } = stateRef.current;
    return { start: selectionStart, end: selectionEnd, direction: selectionDirection, caret: cursorOffset, pane: editMode };
  }, []);

  const setSelectionRange = useCallback((
    start: number | null,
    end?: number | null,
    direction?: SelectionDirectionType | null,
    takeFocus?: boolean,
    pane?: EditModeType,
  ) => {
    if (takeFocus) {
      focus();
    }

    pendingEdit.current = null;
    const current = stateRef.current;
    const dataLength = current.data.length;
    let selectionStart = start ?? (current.selectionDirection === SELECTION_DIRECTION_BACKWARD
      ? current.selectionEnd
      : current.selectionStart);
    selectionStart = Math.max(0, Math.min(Math.trunc(selectionStart) || 0, dataLength));
    let selectionEnd = Math.max(0, Math.min(Math.trunc(end ?? selectionStart) || 0, dataLength));
    let selectionDirection = direction;

    if (selectionEnd < selectionStart) {
      [selectionStart, selectionEnd] = [selectionEnd, selectionStart];
      selectionDirection ??= SELECTION_DIRECTION_BACKWARD;
    }
    if (selectionStart === selectionEnd) {
      selectionStart = selectionEnd = Math.min(selectionStart, current.maxCursorOffset);
      selectionDirection = SELECTION_DIRECTION_NONE;
    } else {
      selectionDirection ??= SELECTION_DIRECTION_FORWARD;
    }

    const nextPane = pane ?? current.editMode;
    const selection = {
      cursorOffset: selectionDirection === SELECTION_DIRECTION_BACKWARD ? selectionStart : selectionEnd,
      editMode: current.showAscii ? nextPane : EDIT_MODE_HEX,
      nybbleHigh: null,
      nybbleOffset: 0,
      selectionStart,
      selectionEnd,
      selectionDirection,
    };
    stateRef.current = { ...current, ...selection };
    setState(selection);
  }, [focus]);

  useBrowserLayoutEffect(() => {
    const pending = pendingEdit.current;
    if (pending && pending.edit === appliedEdit && pending.length === data.length) {
      setSelectionRange(pending.edit.selectionAfter.caret);
      return;
    }
    const { start, end, direction, pane } = getSelection();
    if (end > data.length || (start === end && start > maxCursorOffset)
      || (!showAscii && pane === EDIT_MODE_ASCII)) {
      setSelectionRange(start, end, direction);
    }
  }, [appliedEdit, data.length, getSelection, maxCursorOffset, setSelectionRange, showAscii]);

  const { selectionStart, selectionEnd, selectionDirection, cursorOffset, editMode } = state;
  useBrowserLayoutEffect(() => {
    const input = inputRef.current;
    if (input) {
      let selectedValue = '';
      for (let offset = selectionStart; offset < Math.min(selectionEnd, data.length); offset += 1) {
        selectedValue += editMode === EDIT_MODE_ASCII
          ? String.fromCharCode(data[offset])
          : formatHexByte(data[offset]);
      }
      input.value = selectedValue;
      input.setSelectionRange(0, input.value.length);
    }
  }, [data, editMode, nonce, selectionEnd, selectionStart]);

  const lastSelection = useRef<HexEditorSelection>({
    start: 0, end: 0, caret: 0, direction: SELECTION_DIRECTION_NONE, pane: EDIT_MODE_HEX,
  });
  useEffect(() => {
    const previous = lastSelection.current;
    if (previous.start !== selectionStart || previous.end !== selectionEnd
      || previous.caret !== cursorOffset || previous.direction !== selectionDirection || previous.pane !== editMode) {
      const selection = {
        start: selectionStart, end: selectionEnd, caret: cursorOffset, direction: selectionDirection, pane: editMode,
      };
      lastSelection.current = selection;
      onSelectionChange?.(selection);
    }
  }, [cursorOffset, editMode, onSelectionChange, selectionDirection, selectionEnd, selectionStart]);

  useEffect(() => {
    if (state.selectionAnchor != null) {
      const handleWindowMouseUp = () => {
        setState({ selectionAnchor: null });
        focus();
      };
      window.addEventListener('mouseup', handleWindowMouseUp);
      return () => {
        window.removeEventListener('mouseup', handleWindowMouseUp);
      };
    }
  }, [state.selectionAnchor, focus]);

  const setSelectionStart = useCallback((
    offset: number,
    editMode?: EditModeType,
  ) => {
    const {
      selectionAnchor,
    } = stateRef.current;

    if (selectionAnchor == null) {
      setState({ selectionAnchor: Math.min(offset, stateRef.current.data.length) });
      setSelectionRange(offset, offset, null, false, editMode);
    }
  }, [setSelectionRange]);

  const setSelectionEnd = useCallback((
    offset: number,
    editMode?: EditModeType,
    e?: React.MouseEvent,
  ) => {
    const {
      editMode: prevEditMode,
      selectionAnchor,
      selectionEnd,
      selectionStart,
    } = stateRef.current;

    if (selectionAnchor != null) {
      if (e && editMode !== prevEditMode) {
        return;
      }

      const start = Math.min(selectionAnchor, offset);
      const end = Math.max(selectionAnchor, offset);
      const selectionDirection = offset > selectionAnchor
        ? SELECTION_DIRECTION_FORWARD
        : SELECTION_DIRECTION_BACKWARD;

      if (!e || start !== end || selectionStart !== selectionEnd || Math.abs(e.movementX) > 2) {
        setSelectionRange(start, end + 1, selectionDirection, false, editMode);
      }
    }
  }, [setSelectionRange]);

  const setValue = useCallback((offset: number, value: number) => {
    if (Number.isInteger(offset) && offset >= 0 && offset < stateRef.current.data.length
      && typeof onSetValue === 'function') {
      onSetValue(offset, value);
    }
  }, [onSetValue]);

  const requestEdit = useCallback((offset: number, deleteCount: number, insert: number[], nextCaret: number) => {
    const { data: currentData } = stateRef.current;
    if (!onEdit || offset < 0 || offset + deleteCount > currentData.length
      || (deleteCount === 0 && insert.length === 0)) {
      return;
    }
    const selectionBefore = getSelection();
    const length = currentData.length - deleteCount + insert.length;
    const caret = Math.min(nextCaret, Math.max(0, length - (insertMode ? 0 : 1)));
    const edit: HexEditorEdit = {
      offset,
      deleteCount,
      insert,
      selectionBefore,
      selectionAfter: {
        start: caret,
        end: caret,
        caret,
        direction: SELECTION_DIRECTION_NONE,
        pane: selectionBefore.pane,
      },
    };
    pendingEdit.current = { edit, length };
    setState({ nybbleHigh: null, nybbleOffset: 0 });
    onEdit(edit);
  }, [getSelection, insertMode, onEdit]);

  const scrollTo = useCallback((scrollTop: number) => {
    if (rowListRef.current) {
      rowListRef.current.scrollTo(scrollTop);
    }
  }, []);

  const scrollToItem = useCallback((rowIndex: number, align?: Align) => {
    if (rowListRef.current) {
      rowListRef.current.scrollToItem(rowIndex, align);
    }
  }, []);

  useImperativeHandle(ref, () => ({
    blur,
    focus,
    getSelection,
    scrollTo,
    scrollToItem,
    setSelectionRange,
    setValue,
  }), [blur, focus, getSelection, scrollTo, scrollToItem, setSelectionRange, setValue]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setState({ isFocused: false });
    if (onBlur) {
      onBlur(e);
    }
  }, [onBlur]);

  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setState({ isFocused: true });
    if (onFocus) {
      onFocus(e);
    }
  }, [onFocus]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const {
      which,
      shiftKey,
      ctrlKey,
      metaKey,
    } = e;

    const {
      columns,
      data,
      editMode,
      maxCursorOffset,
      nybbleHigh,
      nybbleOffset,
      readOnly,
      rows,
      selectionStart,
      selectionEnd,
      selectionDirection,
      showAscii,
    } = stateRef.current;
    const dataLength = data.length;

    const isSelection = selectionStart !== selectionEnd;
    const isMacKeyboard = isMacLike();

    const offsetAmounts: { [key: number]: number } = {
      [KEY_DOWN]: columns,
      [KEY_LEFT]: 1,
      [KEY_PAGE_DOWN]: rows * columns,
      [KEY_PAGE_UP]: rows * columns,
      [KEY_RIGHT]: 1,
      [KEY_UP]: columns,
    };

    const typeByte = (value: number) => {
      if (onEdit) {
        const deleteCount = insertMode ? selectionEnd - selectionStart : 1;
        requestEdit(selectionStart, deleteCount, [value], selectionStart + 1);
      } else {
        setValue(selectionStart, value);
        setSelectionRange(selectionStart + 1);
      }
    };

    switch (true) {
      // Select all
      case !isMacKeyboard && ctrlKey && which === KEY_A:
      case isMacKeyboard && metaKey && which === KEY_A: {
        setSelectionRange(0, dataLength);
        e.preventDefault();
        return;
      }

      // Go to first character
      case isMacKeyboard && metaKey && which === KEY_UP:
      case !isMacKeyboard && ctrlKey && which === KEY_HOME: {
        if (shiftKey) {
          const end = selectionDirection === SELECTION_DIRECTION_BACKWARD
            ? selectionEnd
            : selectionStart;
          setSelectionRange(0, end, SELECTION_DIRECTION_BACKWARD);
        } else {
          setSelectionRange(0);
        }
        e.preventDefault();
        return;
      }

      // Go to last character
      case isMacKeyboard && metaKey && which === KEY_DOWN:
      case !isMacKeyboard && ctrlKey && which === KEY_END: {
        if (shiftKey) {
          const start = selectionDirection === SELECTION_DIRECTION_BACKWARD
            ? selectionEnd
            : selectionStart;
          setSelectionRange(start, dataLength, SELECTION_DIRECTION_FORWARD);
        } else {
          setSelectionRange(maxCursorOffset);
        }
        e.preventDefault();
        return;
      }

      // Toggle between hex and ascii panes
      case (which === KEY_TAB): {
        if (!shiftKey && showAscii && editMode === EDIT_MODE_HEX) {
          setSelectionRange(selectionStart, selectionEnd, selectionDirection, false, EDIT_MODE_ASCII);
          e.preventDefault();
        } else if (shiftKey && editMode === EDIT_MODE_ASCII) {
          setSelectionRange(selectionStart, selectionEnd, selectionDirection, false, EDIT_MODE_HEX);
          e.preventDefault();
        }
        return;
      }

      // Go to start of line
      case isMacKeyboard && ctrlKey && which === KEY_A:
      case isMacKeyboard && metaKey && which === KEY_LEFT:
      case which === KEY_HOME: {
        const selectionAnchor = selectionDirection === SELECTION_DIRECTION_BACKWARD
          ? selectionStart
          : selectionEnd;
        if (shiftKey) {
          const cursorPosition = columns * Math.floor(Math.max(0, (selectionAnchor - 1)) / columns);
          if (selectionDirection === SELECTION_DIRECTION_BACKWARD) {
            setSelectionRange(selectionEnd, cursorPosition);
          } else {
            setSelectionRange(selectionStart, cursorPosition);
          }
        } else {
          const cursorPosition = columns * Math.floor(selectionAnchor / columns);
          setSelectionRange(cursorPosition);
        }
        e.preventDefault();
        return;
      }

      // Go to end of line
      case isMacKeyboard && ctrlKey && which === KEY_E:
      case isMacKeyboard && metaKey && which === KEY_RIGHT:
      case which === KEY_END: {
        const selectionAnchor = selectionDirection === SELECTION_DIRECTION_BACKWARD
          ? selectionStart
          : selectionEnd;
        if (shiftKey) {
          const cursorPosition = columns * (Math.floor(selectionAnchor / columns) + 1);
          if (selectionDirection === SELECTION_DIRECTION_BACKWARD) {
            setSelectionRange(selectionEnd, cursorPosition);
          } else {
            setSelectionRange(selectionStart, cursorPosition);
          }
        } else {
          const cursorPosition = columns * (Math.floor(selectionAnchor / columns) + 1) - 1;
          setSelectionRange(Math.min(cursorPosition, maxCursorOffset));
        }
        e.preventDefault();
        return;
      }

      case (isMacKeyboard ? metaKey : ctrlKey) && !e.altKey && (
        e.key.toLowerCase() === 'z' || (!isMacKeyboard && e.key.toLowerCase() === 'y' && !shiftKey)
      ): {
        const historyAction = shiftKey || e.key.toLowerCase() === 'y' ? onRedo : onUndo;
        if (historyAction || onEdit) {
          e.preventDefault();
          if (!readOnly && historyAction) {
            pendingEdit.current = null;
            setState({ nybbleHigh: null, nybbleOffset: 0 });
            historyAction();
          }
        }
        return;
      }

      // Ignore modified keys
      case ctrlKey || metaKey:
        return;

      // Go back one row or column
      case which === KEY_PAGE_UP:
      case which === KEY_UP:
      case which === KEY_LEFT: {
        const offset = offsetAmounts[which] || 1;
        if (shiftKey) {
          if (selectionDirection === SELECTION_DIRECTION_BACKWARD) {
            setSelectionRange(selectionEnd, selectionStart - offset);
          } else {
            setSelectionRange(selectionStart, selectionEnd - offset);
          }
        } else {
          const cursorPosition = isSelection
            ? selectionStart
            : selectionStart - offset;
          setSelectionRange(Math.max(0, cursorPosition));
        }
        e.preventDefault();
        return;
      }

      // Go forward one row or column
      case which === KEY_PAGE_DOWN:
      case which === KEY_DOWN:
      case which === KEY_RIGHT: {
        const offset = offsetAmounts[which] || 1;
        if (shiftKey) {
          if (selectionDirection === SELECTION_DIRECTION_BACKWARD) {
            setSelectionRange(selectionEnd, selectionStart + offset);
          } else {
            setSelectionRange(selectionStart, selectionEnd + offset);
          }
        } else {
          const cursorPosition = isSelection
            ? selectionEnd - (insertMode ? 0 : 1)
            : selectionEnd + offset;
          setSelectionRange(Math.min(cursorPosition, maxCursorOffset));
        }
        e.preventDefault();
        return;
      }

      case which === KEY_BACK_SPACE:
      case which === KEY_DELETE: {
        if (!readOnly) {
          const backspace = which === KEY_BACK_SPACE;
          if (nybbleOffset && nybbleHigh != null) {
            setState({ nybbleHigh: null, nybbleOffset: 0 });
          } else {
            const start = isSelection || !backspace || shiftKey ? selectionStart : selectionStart - 1;
            const count = isSelection ? selectionEnd - selectionStart : 1;
            const next = !insertMode && !isSelection && !backspace && !shiftKey ? start + 1 : start;
            if (onEdit) {
              requestEdit(start, count, insertMode ? [] : new Array<number>(count).fill(0), next);
            } else {
              for (let offset = start; offset < start + count; offset += 1) {
                setValue(offset, 0x00);
              }
              setSelectionRange(next);
            }
          }
        }
        e.preventDefault();
        return;
      }

      // Edit hex value
      case editMode === EDIT_MODE_HEX && which in KEY_VALUES: {
        if (!readOnly && (dataLength > 0 || insertMode)) {
          const nybbleValue = KEY_VALUES[which];
          if (nybbleOffset && nybbleHigh != null) {
            const value = (nybbleHigh << 4) | nybbleValue;
            typeByte(value);
          } else {
            if (isSelection && !onEdit) {
              setSelectionRange(selectionStart);
            }
            pendingEdit.current = null;
            setState({
              nybbleOffset: 1,
              nybbleHigh: nybbleValue,
            });
          }
        }
        e.preventDefault();
        return;
      }

      // Edit ascii value
      case editMode === EDIT_MODE_ASCII: {
        if (!readOnly) {
          const key = Keycoder.fromEvent(e.nativeEvent);
          if (key.charCode != null) {
            const value = shiftKey ? key.shift.charCode : key.charCode;
            if (value != null) {
              typeByte(value);
            }
          }
        }
        e.preventDefault();
        return;
      }

      // Ignore
      default:
        return;
    }
  }, [insertMode, onEdit, onRedo, onUndo, requestEdit, setValue, setSelectionRange]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const {
      selectionEnd,
      selectionStart,
      data,
      editMode: currentEditMode,
      readOnly,
    } = stateRef.current;
    if (readOnly) {
      return;
    }
    const dataLength = data.length;
    const maxOffset = dataLength - selectionStart;
    const clipboardText = e.clipboardData.getData('Text');
    if (currentEditMode === EDIT_MODE_HEX) {
      const hexText = clipboardText.trim();
      if (!hexText) {
        return;
      }
      if (!HEX_PASTE_PATTERN.test(hexText)) {
        onPasteError?.(new Error(
          'Invalid hex input. Use complete byte pairs, optionally separated by whitespace—for example, AB CD.',
        ));
        return;
      }
    }
    const values = currentEditMode === EDIT_MODE_ASCII
      ? clipboardText.split('').map(v => v.charCodeAt(0))
      : (clipboardText.match(HEX_BYTE_PATTERN) || []).map(v => parseInt(v, 16));
    if (!insertMode && values.length > maxOffset) {
      onPasteError?.(new Error('Paste exceeds the remaining buffer length.'));
      return;
    }
    if (onEdit) {
      if (values.some(value => value > 0xff)) {
        onPasteError?.(new Error('ASCII paste accepts characters from U+0000 through U+00FF.'));
        return;
      }
      if (values.length) {
        const deleteCount = insertMode ? selectionEnd - selectionStart : values.length;
        requestEdit(selectionStart, deleteCount, values, selectionStart + values.length);
      }
      return;
    }
    values.forEach((value, i) => {
      setValue(selectionStart + i, value);
    });
    setSelectionRange(Math.min(selectionStart + values.length, dataLength - 1));
  }, [insertMode, onEdit, onPasteError, requestEdit, setValue, setSelectionRange]);

  const handleCut = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    if (!insertMode) {
      return;
    }
    e.preventDefault();
    const { readOnly, selectionStart, selectionEnd } = stateRef.current;
    if (selectionStart !== selectionEnd) {
      e.clipboardData.setData('text/plain', e.currentTarget.value);
      if (!readOnly) {
        requestEdit(selectionStart, selectionEnd - selectionStart, [], selectionStart);
      }
    }
  }, [insertMode, requestEdit]);

  const handleItemsRendered = useCallback((props: ListOnItemsRenderedProps) => {
    setState(props);
    if (onItemsRendered) {
      onItemsRendered(props);
    }
  }, [onItemsRendered]);

  useBrowserLayoutEffect(() => {
    if (autoFocus) {
      focus();
    }
  }, [autoFocus, focus]);

  useBrowserLayoutEffect(() => {
    if (rowListRef.current) {
      const {
        visibleStartIndex,
        visibleStopIndex,
      } = stateRef.current;
      const rowIndex = Math.floor(state.cursorOffset / columns);
      if (rowIndex <= visibleStartIndex) {
        rowListRef.current.scrollToItem(rowIndex, 'center');
      } else if (rowIndex >= visibleStopIndex) {
        rowListRef.current.scrollToItem(rowIndex, 'center');
      }
    }
  }, [columns, state.cursorOffset]);

  const rowCount = useMemo(
    () => Math.ceil((data.length + Number(insertMode)) / columns),
    [data.length, columns, insertMode],
  );

  const formatOffset = useMemo(() => {
    const padToLength = 2 * Math.ceil(formatHex(Math.max(0, data.length - 1)).length / 2);
    return (offset: number) => formatHex(offset, padToLength);
  }, [data.length]);

  const { formatHeaderOffset, formatHeaderValue } = useMemo(() => ({
    formatHeaderOffset: () => formatOffset(0).replace(/./g, '\u00A0'),
    formatHeaderValue: () => '\u00A0',
  }), [formatOffset]);

  const {
    cursorColumn,
    cursorRow,
  } = useMemo(() => {
    const isForwardSelection = (
      state.selectionStart !== state.selectionEnd
      && state.selectionDirection !== SELECTION_DIRECTION_BACKWARD
    );
    const nextCursorColumn = isForwardSelection
      ? (state.cursorOffset - 1) % columns
      : state.cursorOffset % columns;
    const nextCursorRow = isForwardSelection
      ? Math.floor((state.cursorOffset - 1) / columns)
      : Math.floor(state.cursorOffset / columns);
    return {
      cursorColumn: nextCursorColumn,
      cursorRow: nextCursorRow,
    };
  }, [
    columns,
    state.cursorOffset,
    state.selectionStart,
    state.selectionEnd,
    state.selectionDirection,
  ]);

  const editorStyle = useMemo(() => (
    style && inlineStyles.editor
      ? { ...inlineStyles.editor, ...style }
      : (style || inlineStyles.editor || undefined)
  ), [style, inlineStyles.editor]);

  const headerStyle: React.CSSProperties = useMemo(() => ({
    ...inlineStyles.header,
    height: rowHeight,
    width,
  }), [inlineStyles.header, rowHeight, width]);

  const bodyStyle: React.CSSProperties = useMemo(() => ({
    ...inlineStyles.body,
    overflowY: 'scroll',
  }), [inlineStyles.body]);

  const hexEditorContext: HexEditorContextInterface = useMemo(() => ({
    asciiPlaceholder,
    classNames,
    columns,
    cursorColumn: highlightColumn ? cursorColumn : undefined,
    cursorOffset: state.cursorOffset,
    cursorRow,
    data,
    formatOffset,
    formatValue,
    isEditing: !!state.nybbleOffset,
    nonce,
    nybbleHigh: state.nybbleHigh,
    rows,
    selectionAnchor: state.selectionAnchor,
    selectionDirection: state.selectionDirection,
    selectionEnd: state.selectionEnd,
    selectionStart: state.selectionStart,
    setSelectionEnd,
    setSelectionRange,
    setSelectionStart,
    showAscii,
    showRowLabels,
    styles: inlineStyles,
  }), [
    asciiPlaceholder,
    classNames,
    columns,
    cursorColumn,
    cursorRow,
    data,
    formatOffset,
    formatValue,
    highlightColumn,
    inlineStyles,
    nonce,
    rows,
    setSelectionEnd,
    setSelectionRange,
    setSelectionStart,
    showAscii,
    showRowLabels,
    state.cursorOffset,
    state.nybbleHigh,
    state.nybbleOffset,
    state.selectionAnchor,
    state.selectionDirection,
    state.selectionEnd,
    state.selectionStart,
  ]);

  return (
    <HexEditorContext.Provider value={hexEditorContext}>
      <div
        className={joinClassNames(
          className,
          {
            [classNames.editAscii || '']: state.editMode === EDIT_MODE_ASCII,
            [classNames.editHex || '']: state.editMode === EDIT_MODE_HEX,
            [classNames.notFocused || '']: !state.isFocused && state.selectionAnchor == null,
          },
        )}
        style={editorStyle}
      >
        <input
          onBlur={handleBlur}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onCut={handleCut}
          ref={inputRef}
          style={inputStyle || undefined}
          tabIndex={tabIndex}
          type="text"
        />
        {!showColumnLabels ? null : (
          <div className={classNames.header} style={headerStyle}>
            <HexEditorRow
              className={classNames.rowHeader}
              classNames={classNames}
              columns={columns}
              cursorColumn={cursorColumn}
              data={columnData}
              disabled
              formatOffset={formatHeaderOffset}
              formatValue={formatHeaderValue}
              isHeader
              labelOffset={data.length}
              nonce={nonce}
              showAscii={showAscii}
              showLabel={showRowLabels}
              style={inlineStyles.row}
              styles={inlineStyles}
            />
          </div>
        )}
        <HexEditorBody
          className={classNames.body}
          height={showColumnLabels ? height - rowHeight : height}
          onItemsRendered={handleItemsRendered}
          overscanCount={overscanCount || rows}
          rowCount={rowCount}
          rowHeight={rowHeight}
          rows={rows}
          ref={rowListRef}
          style={bodyStyle}
          width={width}
        >
          {children}
        </HexEditorBody>
      </div>
    </HexEditorContext.Provider>
  );
};

HexEditor.displayName = 'HexEditor';

export default memo(forwardRef(HexEditor));
