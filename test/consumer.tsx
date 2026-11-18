import React from "react";
import HexEditor, {
  BaseHexEditor,
  UnstyledBaseHexEditor,
  UnstyledHexEditor,
} from "react-hex-editor";
import type {
  AutoSizeHexEditorProps,
  HexEditorHandle,
  HexEditorTheme,
} from "react-hex-editor";
import oneDarkPro from "react-hex-editor/themes/oneDarkPro";
import defaultTheme from "react-hex-editor/themes";

const ref = React.createRef<HexEditorHandle>();
const props: AutoSizeHexEditorProps = {
  data: new Uint8Array(100),
  onPasteError: (error) => {
    console.log(error.message);
  },
  onSetValue: (offset, value) => {
    console.log(offset, value);
  },
};
const theme: HexEditorTheme = oneDarkPro;
const explicit = {
  columns: 16,
  rows: 10,
  width: 720,
  height: 240,
  rowHeight: 24,
};
export const editors = (
  <>
    <HexEditor {...props} ref={ref} theme={{ hexEditor: theme }} />
    <BaseHexEditor
      {...props}
      {...explicit}
      theme={{ hexEditor: defaultTheme }}
      ref={ref}
    />
    <UnstyledHexEditor {...props} ref={ref} />
    <UnstyledBaseHexEditor {...props} {...explicit} ref={ref} />
  </>
);
ref.current?.scrollToItem(3);
ref.current?.setSelectionRange(0, 4, "backward", true);
