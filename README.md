# React Hex Editor

View and edit binary data in React. This is **sashauly's independently maintained fork** of [Keith McKnight's react-hex-editor](https://github.com/kmck/react-hex-editor), preserving its ISC license and original attribution.

[Development documentation and live demo](https://sashauly.github.io/react-hex-editor/) · [API reference](https://sashauly.github.io/react-hex-editor/api/) · [Support/issues](https://github.com/sashauly/react-hex-editor/issues)

The Pages site is prepared locally; remote setup and its first deployment are pending. See [the guide source](site/App.tsx) for current usage and behavior documentation.

## Install this fork

The upstream npm package named `react-hex-editor` does **not** install this fork. Until a fork release is available, build an installable tarball:

```sh
git clone https://github.com/sashauly/react-hex-editor.git
cd react-hex-editor
nvm install
nvm use
npm ci
npm run package
# In your application:
npm install /path/to/react-hex-editor/artifacts/react-hex-editor-0.3.0.tgz
```

Version 0.3.0 is inherited upstream metadata, not a new fork release. Versioning and registry publication remain deferred.

## Use

```tsx
import React from 'react';
import HexEditor from 'react-hex-editor';
import oneDarkPro from 'react-hex-editor/themes/oneDarkPro';

export function Example() {
  const [data, setData] = React.useState(() => new Uint8Array(256));
  return <div style={{ width: 720, height: 260 }}>
    <HexEditor data={data} showAscii theme={{ hexEditor: oneDarkPro }}
      onSetValue={(offset, value) => {
        setData(previous => {
          const next = previous.slice();
          next[offset] = value;
          return next;
        });
      }} />
  </div>;
}
```

The default export and `UnstyledHexEditor` infer geometry from a sized container. `BaseHexEditor` and `UnstyledBaseHexEditor` require explicit dimensions. All four forward the same ref methods. Use `nonce` to refresh mutable buffers. The editor requests overwrites; the caller owns the data.

Support: React `>=16.8.6 <19`, styled-components `^5.3.11`, TypeScript declarations for 5.6.2+, and current Chrome/Edge, Firefox and Safari. CJS, ESM and theme entry points are retained. Known legacy editing limits, including read-only paste/ref writes, are documented in the guide; validate write policy and bounds in your callback.

## Develop

Use Node 26.13.1 with bundled npm 11.20.0. Commit `package-lock.json` with dependency changes.

```sh
npm ci
npm run validate
npx playwright install --with-deps chromium
npm run test:browser
npm run dev
```

See [contribution and compatibility instructions](CONTRIBUTING.md), [repository setup](docs/REPOSITORY_SETUP.md) and [manual release instructions](docs/RELEASING.md).

## License

ISC © [Keith McKnight](https://github.com/kmck). Original notices are retained in [LICENSE](LICENSE).
