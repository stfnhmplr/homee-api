# Changelog

## [0.16.0] - 2020-09-28
### Changed
- Updated enums
- In case homee is not reachable, it will now try several times with increasing intervals to retrieve an access token. The number of attempts can be limited by the `maxRetries` option