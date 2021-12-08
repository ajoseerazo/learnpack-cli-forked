# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### December 7, 2021

- Deprecated "disableGrading" configuration property.
- Added `disabledActions` array instead, that way we can disable more than just the tests if we want.
- Fixed a bug on the dep merge configuration that was preventing the learn.json to merge with defaults.
- Added `learnpack test` command ready to start testing it.
- Added loading priority on files, html opens last to make it visible.