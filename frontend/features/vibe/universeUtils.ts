import * as THREE from "three";
import type { MapTrack } from "./types";

const MOOD_COLORS: Record<string, [number, number, number]> = {
    moodHappy:      [252, 162, 0],
    moodSad:        [168, 85, 247],
    moodRelaxed:    [34, 197, 94],
    moodAggressive: [239, 68, 68],
    moodParty:      [236, 72, 153],
    moodAcoustic:   [245, 158, 11],
    moodElectronic: [59, 130, 246],
    neutral:        [163, 163, 163],
};

function blendMoodColor(track: MapTrack): [number, number, number] {
    const moods = track.moods;
    if (!moods || Object.keys(moods).length === 0) {
        return MOOD_COLORS.neutral;
    }

    let r = 0, g = 0, b = 0, totalWeight = 0;
    for (const [mood, score] of Object.entries(moods)) {
        const color = MOOD_COLORS[mood];
        if (!color || score <= 0) continue;
        const w = score * score * score;
        r += color[0] * w;
        g += color[1] * w;
        b += color[2] * w;
        totalWeight += w;
    }

    if (totalWeight === 0) return MOOD_COLORS.neutral;
    r = r / totalWeight;
    g = g / totalWeight;
    b = b / totalWeight;

    const gray = (r + g + b) / 3;
    const boost = 1.6;
    r = Math.max(0, Math.min(255, gray + (r - gray) * boost));
    g = Math.max(0, Math.min(255, gray + (g - gray) * boost));
    b = Math.max(0, Math.min(255, gray + (b - gray) * boost));

    return [Math.round(r), Math.round(g), Math.round(b)];
}

/** Returns a Three.js Color for a track, normalized to 0-1 range. */
export function getTrackThreeColor(track: MapTrack): THREE.Color {
    const [r, g, b] = blendMoodColor(track);
    return new THREE.Color(r / 255, g / 255, b / 255);
}

/**
 * Returns an HDR color for bloom. Values > 1.0 will glow when
 * bloom luminanceThreshold < the value. Intensity scales with energy.
 */
export function getTrackBloomColor(track: MapTrack): THREE.Color {
    const [r, g, b] = blendMoodColor(track);
    const energy = track.energy ?? 0.5;
    const intensity = 1.2 + energy * 1.3;
    return new THREE.Color(
        (r / 255) * intensity,
        (g / 255) * intensity,
        (b / 255) * intensity
    );
}

/**
 * Computes bounding sphere for a set of tracks (for zoom-to-cluster).
 * Coordinates are in raw 0-1 space -- caller must scale if needed.
 */
export function computeClusterBounds(
    tracks: MapTrack[],
    trackIds: Set<string>
): { center: THREE.Vector3; radius: number } {
    const points: THREE.Vector3[] = [];
    for (const t of tracks) {
        if (trackIds.has(t.id)) {
            points.push(new THREE.Vector3(t.x, t.y, 0));
        }
    }
    if (points.length === 0) {
        return { center: new THREE.Vector3(0.5, 0.5, 0), radius: 0.5 };
    }

    const center = new THREE.Vector3();
    for (const p of points) center.add(p);
    center.divideScalar(points.length);

    let maxDist = 0;
    for (const p of points) {
        const d = center.distanceTo(p);
        if (d > maxDist) maxDist = d;
    }

    return { center, radius: Math.max(maxDist * 1.3, 0.05) };
}
