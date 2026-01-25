# Icon Font Mapping

This document describes the icon font used for the Synthetic Usage Tracker extension's custom status bar icon.

## Font File

- **File**: `synthetic.woff`
- **Format**: Web Open Font Format (WOFF)
- **Location**: `assets/synthetic.woff`

## Icon Definition

### Icon ID

- **ID**: `synthetic-logo`
- **Description**: Custom Synthetic.new logo icon for the status bar

### Unicode Character

- **Character**: `\uE900`
- **Decimal**: 59616
- **Hex**: 0xE900

### Usage in VSCode

To use the icon in the status bar, reference it with:

```typescript
statusBarItem.text = "$(synthetic-logo) Usage Data";
```

## Package.json Configuration

The icon is registered in [`package.json`](../package.json) under the `contributes.icons` section:

```json
{
  "contributes": {
    "icons": {
      "synthetic-logo": {
        "description": "Synthetic.new logo icon",
        "default": {
          "fontPath": "./assets/synthetic.woff",
          "fontCharacter": "\\uE900"
        }
      }
    }
  }
}
```

## Font Generation Instructions

### Important Note

The current `synthetic.woff` file is a **placeholder** and must be replaced with a real font file before the extension can use the custom icon.

### How to Generate the Real Font File

1. **Prepare the SVG file**:
   - The SVG file [`icon-bw.svg`](icon-bw.svg) is already created in the `assets/` directory
   - This SVG represents the Synthetic.new logo design

2. **Use IcoMoon App**:
   - Go to [https://icomoon.io/app](https://icomoon.io/app)
   - Click "Import Icons" and select [`icon-bw.svg`](icon-bw.svg)
   - The icon will appear in the selection panel

3. **Configure the icon**:
   - Select the imported icon
   - Click "Generate Font" at the bottom
   - Set the font name to `synthetic`
   - Ensure the icon is mapped to unicode character `\uE900` (or note the actual character assigned)

4. **Download the font**:
   - Download the generated font package
   - Extract the `.woff` file from the package
   - Rename it to `synthetic.woff` if necessary
   - Replace the placeholder file in `assets/synthetic.woff`

5. **Update the mapping** (if needed):
   - If IcoMoon assigned a different unicode character, update this file
   - Update the `fontCharacter` value in [`package.json`](../package.json)

### Alternative Tools

If you prefer other tools, consider:

- **FontForge**: Open-source font editor
- **Glyphr Studio**: Free online vector font editor
- **Fontello**: Online icon font generator
- **Font Custom**: Command-line font generator

## Design Rationale

The icon font approach was chosen for the following reasons:

1. **VSCode Extension Requirements**: VSCode extensions require custom status bar icons to be provided as icon fonts (`.woff` format)
2. **Scalability**: Font icons can scale without losing quality
3. **Theme Integration**: Font icons can use VSCode's theme colors automatically
4. **Performance**: Single font file is more efficient than multiple image files

## Testing the Icon

After generating the real font file:

1. Build the extension: `npm run compile`
2. Launch the extension: Press `F5` in VSCode
3. The status bar should display the custom icon next to the usage data

## Troubleshooting

### Icon Not Displaying

If the icon doesn't appear in the status bar:

1. Verify the `synthetic.woff` file exists in `assets/`
2. Check that the file is not corrupted (it should be a valid WOFF file)
3. Confirm the unicode character matches in both this file and [`package.json`](../package.json)
4. Check the VSCode Developer Tools console for font loading errors

### Font Character Conflicts

If the unicode character `\uE900` is already used by another icon:

1. Choose a different character in the Private Use Area (U+E000 to U+F8FF)
2. Update the `fontCharacter` in [`package.json`](../package.json)
3. Regenerate the font with the new character mapping

## References

- [VSCode Extension API - Icons](https://code.visualstudio.com/api/references/contribution-points#contributes.icons)
- [IcoMoon Documentation](https://icomoon.io/docs.html)
- [WOFF File Format Specification](https://www.w3.org/TR/WOFF/)
