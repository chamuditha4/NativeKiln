# Mac runner installation assets (Phase 4)

This directory holds the macOS runner installation script and `launchd` plist
template. The runner agent itself lives in `apps/mac-runner`. Full installation,
update, and `launchd` management are delivered in Phase 4.

Planned contents:

- `install.sh` — install Node/CocoaPods/Fastlane, register the runner, load launchd.
- `com.nativekiln.runner.plist` — launchd service template.
- `keepawake.md` — preventing sleep during active builds.
