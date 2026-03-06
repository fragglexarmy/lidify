# v1.6.3 - Library Cleanup, OpenSubsonic, Track Identity

Closes #143, #141.

## Library Cleanup (#143)

- **Corrupt file detection** -- Tracks that fail metadata parsing during scan are flagged as `corrupt` instead of silently ignored. Corrupt flag clears automatically if the file is fixed and re-scanned.
- **Playlist-protected track removal** -- Missing tracks referenced by playlists are now converted to `PlaylistPendingTrack` entries (shown as "unavailable" in the UI) instead of blocking deletion.
- **Enrichment circuit breaker** -- Tracks that exceed max retry attempts are marked `permanently_failed` and excluded from future enrichment cycles.
- **Corrupt tracks admin UI** -- New section in Settings to view and bulk-delete corrupt tracks. Endpoints require admin auth.

## OpenSubsonic Enhanced Endpoints (#141)

- **getMusicDirectory** -- Folder-based browsing for clients that use directory navigation
- **getLyrics** -- Serves lyrics from the existing lyrics database
- **getSongsByGenre** -- Filter tracks by genre
- **getTopSongs / getSimilarSongs** -- Artist-based track discovery
- **savePlayQueue / getPlayQueue** -- Cross-device playback resume
- **createBookmark / deleteBookmark / getBookmarks** -- Position bookmarks for audiobooks/podcasts
- **getAlbumList2 songCount fix** -- Album list responses now include correct track counts
- **Stub endpoints** -- getNowPlaying, getScanStatus, startScan, setRating, getAlbumInfo return valid empty responses

## Track Identity & Cross-Platform Import

- **ISRC from ID3 tags** -- Library scanner extracts ISRC codes from audio file metadata during scan
- **ISRC Strategy 0** -- Import matching now tries deterministic ISRC lookup before any fuzzy text matching
- **song.link integration** -- New `SongLinkService` resolves any streaming URL to canonical metadata (Spotify ID, title, artist, cover art) with Redis caching
- **TrackIdentityService** -- Central service for URL resolution, ISRC storage (priority-based: id3 > spotify > deezer > musicbrainz > songlink), and genre population
- **MusicBrainz genre enrichment** -- ISRC-based genre and tag lookup populates `TrackGenre` junction table during import and background enrichment
- **YouTube playlist import** -- YouTube and YouTube Music playlist URLs extracted via yt-dlp (replaced dead Invidious instances). Tracks with native metadata (YouTube Music, Bandcamp, SoundCloud) skip song.link for faster resolution
- **SoundCloud / Bandcamp / Mixcloud import** -- Playlist URLs from these platforms are now accepted in the import flow, resolved via yt-dlp + song.link
- **Background ISRC enrichment** -- Existing library tracks without ISRC are enriched via MusicBrainz during the unified enrichment cycle
- **Normalization consolidation** -- Five inline normalization functions extracted from `spotifyImport.ts` into shared `utils/normalization.ts`

## Security Hardening

- **SQL injection fix** -- Parameterized genre LIKE patterns in Subsonic raw SQL queries (`getSongsByGenre`, search endpoints). Switched from JS-side string concatenation to SQL-side `'%' || $param || '%'` to preserve Prisma's automatic parameterization
- **SSE ticket-based auth** -- Replaced JWT in EventSource query strings with one-time-use UUID tickets (30s TTL, Redis GETDEL). Eliminates token leakage via server logs, browser history, and referrer headers (OWASP token-in-URL)
- **Content-Security-Policy** -- Added CSP header with restrictive defaults: `default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, whitelisted image CDNs. `'unsafe-eval'` only in dev mode
- **Self-hosted fonts** -- Replaced Google Fonts CDN with locally hosted Montserrat woff2. No outbound requests to Google on page load
- **Error page genericization** -- Removed raw `error.message` from error boundary pages to prevent information disclosure

## Audit Fixes

- Removed dead `enrichTrackIdentity()` method from enrichment.ts
- Added `requireAdmin` to corrupt tracks endpoints, removed `filePath` from GET response
- Fixed ISRC priority bug where unknown `isrcSource` values blocked overwrites
- Batched `populateTrackGenres()` with `$transaction` to reduce DB round-trips
- Collapsed duplicate branches in `resolveUrl()`
- Removed Apple Music/Tidal from import validation (no playlist extraction support)
- Removed unused `axios` import from spotifyImport.ts
- Added SSRF protection on preview route with `supportedDomains` whitelist
- Added song.link per-track timeout (8s) to prevent import stalls on unresolvable URLs
