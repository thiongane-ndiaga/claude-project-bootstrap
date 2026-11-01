# Changelog

## [0.1.6](https://github.com/thiongane-ndiaga/claude-project-bootstrap/compare/v0.1.5...v0.1.6) (2026-11-01)


### Features

* **audit:** read-only audit of a generated project (local, forge, workstation) ([#95](https://github.com/thiongane-ndiaga/claude-project-bootstrap/issues/95)) ([d9a5f43](https://github.com/thiongane-ndiaga/claude-project-bootstrap/commit/d9a5f43352373529ce6b3835ed5c5cc26b41818c))
* **scaffold:** cli install modes (global, user prefix, local) ([#99](https://github.com/thiongane-ndiaga/claude-project-bootstrap/issues/99)) ([ff1e709](https://github.com/thiongane-ndiaga/claude-project-bootstrap/commit/ff1e709e80e7bef860e15848780c87513b8d2108)), closes [#28](https://github.com/thiongane-ndiaga/claude-project-bootstrap/issues/28)
* **scaffold:** self-describing module folders ([#102](https://github.com/thiongane-ndiaga/claude-project-bootstrap/issues/102)) ([d5df2fa](https://github.com/thiongane-ndiaga/claude-project-bootstrap/commit/d5df2fa85a184ebabe1a277549a49884ef05d833)), closes [#49](https://github.com/thiongane-ndiaga/claude-project-bootstrap/issues/49)
* **skill:** resume state and global effects journal ([#101](https://github.com/thiongane-ndiaga/claude-project-bootstrap/issues/101)) ([29d4133](https://github.com/thiongane-ndiaga/claude-project-bootstrap/commit/29d41339174b96431ec09acf04853ac0dc5c35af)), closes [#47](https://github.com/thiongane-ndiaga/claude-project-bootstrap/issues/47)
* **templates:** english templates and doc language setting ([#100](https://github.com/thiongane-ndiaga/claude-project-bootstrap/issues/100)) ([574226d](https://github.com/thiongane-ndiaga/claude-project-bootstrap/commit/574226d13fe222fa44304b4edd456b3bde995bd7)), closes [#48](https://github.com/thiongane-ndiaga/claude-project-bootstrap/issues/48)
* **templates:** optional dependabot module for pinned actions ([#98](https://github.com/thiongane-ndiaga/claude-project-bootstrap/issues/98)) ([4229c9d](https://github.com/thiongane-ndiaga/claude-project-bootstrap/commit/4229c9df1afaa7e4deb6615f14c7800a32b9ef9d)), closes [#51](https://github.com/thiongane-ndiaga/claude-project-bootstrap/issues/51)

## [0.1.5](https://github.com/thiongane-ndiaga/claude-project-bootstrap/compare/v0.1.4...v0.1.5) (2026-10-31)


### Features

* **migrations:** native forge labels, non-destructive label sync and migration 0002 ([#91](https://github.com/thiongane-ndiaga/claude-project-bootstrap/issues/91)) ([7e17132](https://github.com/thiongane-ndiaga/claude-project-bootstrap/commit/7e17132fb89882f9bc279739eb231d8b74afed06))

## [0.1.4](https://github.com/thiongane-ndiaga/claude-project-bootstrap/compare/v0.1.3...v0.1.4) (2026-10-31)


### Features

* **scaffold:** owned files created once and never updated ([#75](https://github.com/thiongane-ndiaga/claude-project-bootstrap/issues/75)) ([#77](https://github.com/thiongane-ndiaga/claude-project-bootstrap/issues/77)) ([13a6479](https://github.com/thiongane-ndiaga/claude-project-bootstrap/commit/13a647969fda0fec303a9b978e779fcedac47e5e))
* **scaffold:** three-way merge of modified generated files with a stored base ([#86](https://github.com/thiongane-ndiaga/claude-project-bootstrap/issues/86)) ([cdab639](https://github.com/thiongane-ndiaga/claude-project-bootstrap/commit/cdab63954b29303309a9a0c7231d49477a8e8f3c))
* **templates:** project-setup action owned by the project, called by ci.yml ([#87](https://github.com/thiongane-ndiaga/claude-project-bootstrap/issues/87)) ([5f34780](https://github.com/thiongane-ndiaga/claude-project-bootstrap/commit/5f34780f811a32d87b3f8243c60ce36cfe5e4680))

## [0.1.3](https://github.com/thiongane-ndiaga/claude-project-bootstrap/compare/v0.1.2...v0.1.3) (2026-10-31)


### Features

* **scaffold:** manifest and existing-project mode ([#71](https://github.com/thiongane-ndiaga/claude-project-bootstrap/issues/71)) ([7c54278](https://github.com/thiongane-ndiaga/claude-project-bootstrap/commit/7c54278e228f4695fd046a3234058f32a5f7a67e)), closes [#27](https://github.com/thiongane-ndiaga/claude-project-bootstrap/issues/27)
* **scaffold:** refuse incompatible modules via a conflicts field ([#70](https://github.com/thiongane-ndiaga/claude-project-bootstrap/issues/70)) ([caad2d6](https://github.com/thiongane-ndiaga/claude-project-bootstrap/commit/caad2d63c3f09da290ce8b19c7d256733c905b0f)), closes [#26](https://github.com/thiongane-ndiaga/claude-project-bootstrap/issues/26)
* **scaffold:** update bootstrapped projects across plugin versions ([#74](https://github.com/thiongane-ndiaga/claude-project-bootstrap/issues/74)) ([0ad1ab5](https://github.com/thiongane-ndiaga/claude-project-bootstrap/commit/0ad1ab52a74b01dd34af86abe7308553706a3563)), closes [#44](https://github.com/thiongane-ndiaga/claude-project-bootstrap/issues/44)

## [0.1.2](https://github.com/thiongane-ndiaga/claude-project-bootstrap/compare/v0.1.1...v0.1.2) (2026-10-31)


### Bug Fixes

* **templates:** omit empty env key in generated ci.yml ([#68](https://github.com/thiongane-ndiaga/claude-project-bootstrap/issues/68)) ([4049858](https://github.com/thiongane-ndiaga/claude-project-bootstrap/commit/40498581601d9002a888586b1cbb78db8e2479d8))

## [0.1.1](https://github.com/thiongane-ndiaga/claude-project-bootstrap/compare/v0.1.0...v0.1.1) (2026-10-31)


### Features

* add modular tooling templates and module catalog ([8d0fa1d](https://github.com/thiongane-ndiaga/claude-project-bootstrap/commit/8d0fa1dc206f3bc7aa1cf0fbdf7de1a046b72594))
* add scaffold generator with tests ([3bb39f2](https://github.com/thiongane-ndiaga/claude-project-bootstrap/commit/3bb39f235af9b6906d47922c5533ce869b259454))
* resolve pinned CLI versions and action SHAs ([0b642c3](https://github.com/thiongane-ndiaga/claude-project-bootstrap/commit/0b642c306ea6a4c0a3534fd26cdf057d9bff7889))
* **templates:** add .bootstrap/checks.json extension point for project commands ([#65](https://github.com/thiongane-ndiaga/claude-project-bootstrap/issues/65)) ([718f46f](https://github.com/thiongane-ndiaga/claude-project-bootstrap/commit/718f46fc0f5ab35ce79b3a7ad028ad87988ba40e))


### Bug Fixes

* **agents:** drop % from traceability-checker git log command ([#56](https://github.com/thiongane-ndiaga/claude-project-bootstrap/issues/56)) ([7be98e6](https://github.com/thiongane-ndiaga/claude-project-bootstrap/commit/7be98e6e8b63dc7b64995e4a8466e1ae6bbccaf0)), closes [#41](https://github.com/thiongane-ndiaga/claude-project-bootstrap/issues/41)
* **scripts:** resolve latest stable CLI versions, filter only actions ([#59](https://github.com/thiongane-ndiaga/claude-project-bootstrap/issues/59)) ([86d3743](https://github.com/thiongane-ndiaga/claude-project-bootstrap/commit/86d3743e42a69d72b19fd8b613cf4551c3c2002c)), closes [#18](https://github.com/thiongane-ndiaga/claude-project-bootstrap/issues/18)
* **skill:** detect non-writable npm prefix before global install ([#55](https://github.com/thiongane-ndiaga/claude-project-bootstrap/issues/55)) ([d517c29](https://github.com/thiongane-ndiaga/claude-project-bootstrap/commit/d517c29ac64826b2974f904d231dba66cd8c23d6)), closes [#16](https://github.com/thiongane-ndiaga/claude-project-bootstrap/issues/16)
