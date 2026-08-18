# Screenshots

The root [README](../../README.md) links to six screenshots by exact
filename, and this folder — `docs/screenshots/` — is where they need to
live. If a name below doesn't match exactly, the image just shows as a
broken link on GitHub, so double-check the spelling and the `.png`
extension before committing.

| Filename | What should be on screen |
|---|---|
| `map.png` | Map tab, with live traffic visible and one aircraft selected |
| `search.png` | Search tab list, with the freshness caption ("N aircraft, updated…") visible |
| `detail.png` | A flight's detail screen, with the altitude ribbon loaded |
| `airports.png` | An airport board, with the credit-cost button visible |
| `track.png` | Track tab, ideally in airplane mode, showing "last seen" timestamps |
| `settings.png` | Settings, with the budget meter showing some real spend |

The brief specifically asks for the app to be tested on both Android and
iOS, so however you end up building your own set, it's worth actually
capturing at least a few of these from each platform rather than all six
from whichever device happens to be closest. Steps for both are below.

## iOS

**On a physical iPhone or iPad:** press the side button and the volume-up
button at the same time, then let go — a screenshot lands in the Photos
app, in the Screenshots album. Get it onto your computer however you
normally would (AirDrop to a Mac, plug in and use the Photos import on
Windows, or just email/upload it to yourself), then rename it and move it
into this folder.

**On the iOS Simulator (needs a Mac with Xcode):** with the simulator
window focused, press `Cmd+S`, or use the menu bar under **File → New
Screen Shot**. It saves straight to your Desktop as a PNG — move it into
this folder and rename it from there.

## Android

**On a physical Android phone:** press the power button and volume-down
button together and hold for a second. The screenshot saves to your
Photos/Gallery app, usually under a "Screenshots" album. Plug the phone
into your computer over USB and copy it out of
`Internal storage/Pictures/Screenshots`, or share it to yourself via
Google Photos/email, then move it here and rename it.

**On an Android emulator (Android Studio's AVD):** there's a camera icon
in the toolbar running down the side of the emulator window — click it
and it saves a PNG straight to your computer. The exact save location is
shown in the notification/toast that pops up when you take it (it varies
by Android Studio version and settings, so it's worth just watching for
that message once). Move the file into this folder and rename it.

If you'd rather script it, and you've got `adb` on your `PATH`, this pulls
the most recent screenshot the emulator/device saved straight into this
folder:

```bash
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png docs/screenshots/map.png
```

(swap `map.png` for whichever of the six filenames you're capturing, and
run it again for each screen)

## After capturing

Once all six PNGs are sitting in this folder with the exact names from the
table above, commit them along with the rest of the repo:

```bash
git add docs/screenshots
git commit -m "Add screenshots"
```

The root README will pick them up automatically — nothing else needs to
change.
