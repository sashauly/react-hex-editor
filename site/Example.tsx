import React from "react";
import HexEditor from "react-hex-editor";
import oneDarkPro from "react-hex-editor/themes/oneDarkPro";

export function Example() {
  const [data, setData] = React.useState(() => new Uint8Array(256));
  return (
    <div style={{ width: 720, height: 260 }}>
      <HexEditor
        data={data}
        showAscii
        theme={{ hexEditor: oneDarkPro }}
        onSetValue={(offset, value) => {
          setData((previous) => {
            const next = previous.slice();
            next[offset] = value;
            return next;
          });
        }}
      />
    </div>
  );
}
