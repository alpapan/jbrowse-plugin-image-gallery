import { readConfObject } from '@jbrowse/core/configuration'

// Simple utilities to safely access configuration values

/**
 * Safely get tracks from session using the same pattern as flexibleViewUtils.ts
 * This matches how the search system successfully accesses tracks
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getTracksFromSession(session: any): unknown[] {
  try {
    const { jbrowse } = session
    let trackConfs: unknown[] = []

    // Try multiple ways to access tracks - same as getBaseTrackConfigs in flexibleViewUtils.ts
    if (jbrowse?.configuration && 'tracks' in jbrowse.configuration) {
      trackConfs = jbrowse.configuration.tracks || []
      console.log(
        '🔧 DEBUG: Found tracks via jbrowse.configuration.tracks:',
        trackConfs.length,
      )
    } else if (jbrowse?.tracks && Array.isArray(jbrowse.tracks)) {
      trackConfs = jbrowse.tracks
      console.log(
        '🔧 DEBUG: Found tracks via jbrowse.tracks:',
        trackConfs.length,
      )
    }

    // Add session tracks
    const sessionTracks = session.sessionTracks ?? session.tracks ?? []
    if (sessionTracks.length > 0) {
      trackConfs = [...trackConfs, ...sessionTracks]
      console.log(
        '🔧 DEBUG: Added session tracks:',
        sessionTracks.length,
        'total:',
        trackConfs.length,
      )
    }

    console.log(
      '🔧 DEBUG: getTracksFromSession returning',
      trackConfs.length,
      'total tracks',
    )
    return trackConfs
  } catch (error) {
    console.warn('Failed to get tracks from session:', error)
    return []
  }
}

/**
 * Safely get track ID from track configuration
 * Uses direct property access as recommended in AGENT.md
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getTrackId(trackConf: any): string {
  return String(trackConf?.trackId ?? trackConf?.configuration?.trackId ?? '')
}

/**
 * Safely get adapter configuration from track configuration
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAdapterConfig(trackConf: any): unknown {
  try {
    return readConfObject(trackConf, ['adapter'])
  } catch {
    return trackConf?.adapter ?? trackConf?.configuration?.adapter
  }
}

/**
 * Safely get assembly names from track configuration
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAssemblyNames(trackConf: any): string[] {
  const directAssemblyNames =
    trackConf?.assemblyNames ?? trackConf?.configuration?.assemblyNames
  if (Array.isArray(directAssemblyNames)) {
    return directAssemblyNames.filter(name => typeof name === 'string')
  } else if (typeof directAssemblyNames === 'string') {
    return [directAssemblyNames]
  }
  return []
}
