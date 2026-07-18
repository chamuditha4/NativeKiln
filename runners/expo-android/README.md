# Expo Android runner (Phase 2)

Concrete `BuildAdapter` (see `@native-kiln/build-engine`) and the container image
that builds Expo Continuous Native Generation projects into APK/AAB artifacts.

Not implemented in Phase 0. The runner-manager launches this image as an
ephemeral, unprivileged container with CPU/memory/PID/disk/wall-clock limits and
no Docker socket.
