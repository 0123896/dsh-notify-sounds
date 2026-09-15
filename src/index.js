/**
 * @author 0123896
 *
 * A reusable, portable DSH "DingDing" notification-sounds plugin.
 *
 * This package is a reference source tree for a DeepSeek Harness dynamic
 * Cordis plugin. Dynamic Cordis plugins for DSH are authored as two plain-JS
 * bodies:
 *
 *   - code.host   = src/host.js    (serves optional sound files, detects events)
 *   - code.client = src/client.js  (browser: drains + plays the sound)
 *
 * To load it into a running DSH session, paste those two bodies into the
 * `cordis_define` tool (see README), or mount them statically via a cordis
 * composition that uses the same service/event contracts.
 *
 * This module is provided for convenience/documentation only — DSH dynamic
 * plugins are sourced from the two bodies, not from this module.
 */

module.exports = {
  name: '@0123896/dsh-notify-sounds',
  hostSource: require('fs').readFileSync(__dirname + '/host.js', 'utf8'),
  clientSource: require('fs').readFileSync(__dirname + '/client.js', 'utf8'),
}