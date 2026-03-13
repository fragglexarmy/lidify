"use client";

import { useRef, useEffect, useMemo, useCallback } from "react";
import * as THREE from "three";
import { ThreeEvent } from "@react-three/fiber";
import type { MapTrack } from "./types";
import { getTrackBloomColor } from "./universeUtils";

function hashToFloat(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return ((h & 0x7fffffff) / 0x7fffffff) * 2 - 1;
}

interface TrackCloudProps {
    tracks: MapTrack[];
    highlightedIds: Set<string>;
    selectedTrackId: string | null;
    onTrackClick: (trackId: string) => void;
    onTrackHover: (track: MapTrack | null, point: THREE.Vector3 | null) => void;
}

const WORLD_SCALE = 200;
const DIM_OPACITY = 0.12;

const vertexShader = `
    attribute float size;
    attribute vec3 customColor;
    attribute float opacity;
    varying vec3 vColor;
    varying float vOpacity;
    void main() {
        vColor = customColor;
        vOpacity = opacity;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const fragmentShader = `
    varying vec3 vColor;
    varying float vOpacity;
    void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float intensity = 1.0 - smoothstep(0.0, 0.5, d);
        float glow = exp(-d * 6.0) * 0.6;
        float alpha = (intensity + glow) * vOpacity;
        gl_FragColor = vec4(vColor * (1.0 + glow * 2.0), alpha);
    }
`;

export function TrackCloud({
    tracks,
    highlightedIds,
    selectedTrackId,
    onTrackClick,
    onTrackHover,
}: TrackCloudProps) {
    const pointsRef = useRef<THREE.Points>(null!);

    const hasHighlights = highlightedIds.size > 0;

    const { geometry, material } = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(tracks.length * 3);
        const colors = new Float32Array(tracks.length * 3);
        const sizes = new Float32Array(tracks.length);
        const opacities = new Float32Array(tracks.length);

        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            positions[i * 3] = track.x * WORLD_SCALE;
            positions[i * 3 + 1] = track.y * WORLD_SCALE;
            positions[i * 3 + 2] = hashToFloat(track.id) * WORLD_SCALE * 0.15;

            const bloomColor = getTrackBloomColor(track);
            colors[i * 3] = bloomColor.r;
            colors[i * 3 + 1] = bloomColor.g;
            colors[i * 3 + 2] = bloomColor.b;

            const energy = track.energy ?? 0.5;
            sizes[i] = 1.5 + energy * 3.0;
            opacities[i] = 1.0;
        }

        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geo.setAttribute("customColor", new THREE.BufferAttribute(colors, 3));
        geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
        geo.setAttribute("opacity", new THREE.BufferAttribute(opacities, 1));

        const mat = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        return { geometry: geo, material: mat };
    }, [tracks]);

    useEffect(() => {
        if (!geometry || tracks.length === 0) return;

        const colors = geometry.getAttribute("customColor") as THREE.BufferAttribute;
        const opacities = geometry.getAttribute("opacity") as THREE.BufferAttribute;
        const sizes = geometry.getAttribute("size") as THREE.BufferAttribute;

        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            const isHighlighted = !hasHighlights || highlightedIds.has(track.id);
            const isSelected = track.id === selectedTrackId;

            const bloomColor = getTrackBloomColor(track);

            if (isSelected) {
                colors.setXYZ(i, 2.0, 2.0, 2.0);
                opacities.setX(i, 1.0);
                const energy = track.energy ?? 0.5;
                sizes.setX(i, (1.5 + energy * 3.0) * 2.0);
            } else if (isHighlighted) {
                colors.setXYZ(i, bloomColor.r, bloomColor.g, bloomColor.b);
                opacities.setX(i, 1.0);
                const energy = track.energy ?? 0.5;
                sizes.setX(i, 1.5 + energy * 3.0);
            } else {
                colors.setXYZ(i, bloomColor.r * 0.3, bloomColor.g * 0.3, bloomColor.b * 0.3);
                opacities.setX(i, DIM_OPACITY);
                const energy = track.energy ?? 0.5;
                sizes.setX(i, (1.5 + energy * 3.0) * 0.5);
            }
        }

        colors.needsUpdate = true;
        opacities.needsUpdate = true;
        sizes.needsUpdate = true;
    }, [tracks, highlightedIds, selectedTrackId, hasHighlights, geometry]);

    const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (e.index !== undefined && e.index < tracks.length) {
            onTrackClick(tracks[e.index].id);
        }
    }, [tracks, onTrackClick]);

    const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        if (e.index !== undefined && e.index < tracks.length) {
            const track = tracks[e.index];
            const point = new THREE.Vector3(
                track.x * WORLD_SCALE,
                track.y * WORLD_SCALE,
                0
            );
            onTrackHover(track, point);
        }
    }, [tracks, onTrackHover]);

    const handlePointerOut = useCallback(() => {
        onTrackHover(null, null);
    }, [onTrackHover]);

    if (tracks.length === 0) return null;

    return (
        <points
            ref={pointsRef}
            geometry={geometry}
            material={material}
            onClick={handleClick}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
        />
    );
}

export { WORLD_SCALE };
