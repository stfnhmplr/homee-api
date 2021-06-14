# Changelog

## [0.22.0] - 2021-06-14
### Changed
- Updated enums
- Errors due to unexpected messages are now caught

## [0.21.1] - 2021-04-15
### Changed
- Bugfix: Store homeegrams to class if message type is all

## [0.21.0] - 2021-04-14
### Added
- Added homeegrams to class

## [0.20.0] - 2021-04-04
### Added
- Added plans to class
### Changed
- Fixed property updating

## [0.19.0] - 2021-03-20
### Changed
- Updated enums

## [0.18.0] - 2020-12-10
### Changed
- Updated enums
- Note for use of multiple connections added to readme

## [0.16.0] - 2020-09-28
### Changed
- Updated enums
- In case homee is not reachable, it will now try several times with increasing intervals to retrieve an access token. The number of attempts can be limited by the `maxRetries` option
