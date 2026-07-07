# Resources

Place your application icons here before packaging:

| File | Platform | Size |
|------|----------|------|
| `icon.icns` | macOS | 512×512 (multi-size) |
| `icon.ico` | Windows | 256×256 (multi-size) |
| `icon.png` | Linux | 512×512 |

## Generating Icons

You can generate all formats from a single 1024×1024 PNG using a tool like
[electron-icon-builder](https://github.com/safu9/electron-icon-builder):

```bash
npx electron-icon-builder --input=./icon-source.png --output=./resources
```

Or with macOS `iconutil` and ImageMagick for cross-platform generation.

> **Note:** The app will still build and run in development without icons.
> Icons are only required for production packaging (`npm run package`).
