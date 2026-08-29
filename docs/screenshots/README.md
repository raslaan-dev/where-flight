# Screenshots

The root [README](../../README.md) and [USER_TESTING.md](../../USER_TESTING.md)
reference screenshots by exact filename, split by platform:

```
docs/screenshots/
├── ios/        captured on a physical iPhone or the iOS Simulator
└── android/    captured on a physical Android device or an emulator
```

Both briefs ask for the app to be tested on Android and iOS, so capture each
screen on both. If a name below does not match exactly, the image shows as a
broken link on GitHub — check the spelling and the `.png` extension.

| Filename | What should be on screen |
|---|---|
| `map.png` | Map tab, live traffic visible, one aircraft selected with its trail |
| `search.png` | Search tab list, freshness caption ("N aircraft, updated…") visible |
| `detail.png` | A flight's detail screen, altitude ribbon loaded |
| `track.png` | Track tab, ideally in aeroplane mode, showing "last seen" ages |
| `airports.png` | An airport board, with the credit-cost button visible |
| `settings.png` | Settings, with the budget meter showing real spend |
| `navigation.png` | The bottom tab bar |
| `theme-dark.png` / `theme-light.png` | The same screen in both themes |
| `persistence-before.png` / `persistence-after.png` | A tracked flight before and after a restart in aeroplane mode |

Screenshots showing **completed results** are much stronger evidence than empty
input screens. For the persistence pair especially, make sure the "last seen"
age is legible — that is the part that proves the data came off disk.

## iOS

**Physical iPhone or iPad:** press the side button and volume-up together, then
release. The screenshot lands in Photos, in the Screenshots album. Get it onto
your computer however you normally would — AirDrop to a Mac, the Photos import
on Windows, or email it to yourself — then rename it and move it into
`docs/screenshots/ios/`.

**iOS Simulator (needs a Mac with Xcode):** with the simulator focused, press
`Cmd+S`, or use **File → New Screen Shot** in the menu bar. It saves to your
Desktop as a PNG.

## Android

**Physical Android phone:** press power and volume-down together and hold for a
second. It saves to your Photos/Gallery under a "Screenshots" album. Copy it
out of `Internal storage/Pictures/Screenshots` over USB, or share it to
yourself, then move it into `docs/screenshots/android/`.

**Android emulator (Android Studio AVD):** click the camera icon in the toolbar
down the side of the emulator window. The save location appears in the toast
that pops up — it varies by Android Studio version, so watch for it the first
time.

If you have `adb` on your `PATH`, this pulls a screenshot straight into place:

```bash
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png docs/screenshots/android/map.png
```

Swap `map.png` for whichever screen you are capturing, and repeat per screen.

> **Note on the emulator and the map.** Android emulators often cannot provide
> WebGL, so the app falls back to its native radar view instead of the MapLibre
> map. That is expected behaviour, not a bug — but it does mean an emulator
> `map.png` may look different from the iOS one. Capture the map screenshot on
> a physical device if you can, and use the emulator for the other screens.

## After capturing

```bash
git add docs/screenshots
git commit -m "Add screenshots"
```

Both documents pick them up automatically — nothing else needs to change.
