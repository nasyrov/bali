// The scooter, in the flat-shaded low-poly style: a handful of boxes and two wheels, built
// facing north so that yawing it by the bike's heading points it the right way. The real
// model arrives with the art kit; this is the shape a rider needs to read their own bike.

import * as THREE from 'three';
import { PALETTE } from './look.ts';

function part(colour: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: colour, flatShading: true, roughness: 0.7, metalness: 0 });
}

/** A scooter group whose origin is the contact patch, nose pointing north. */
export function createBikeMesh(): THREE.Group {
  const scooter = new THREE.Group();
  const body = part(PALETTE.scooter);
  const seat = part(PALETTE.seat);
  const tyre = part(PALETTE.tyre);

  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    scooter.add(mesh);
    return mesh;
  };

  add(new THREE.BoxGeometry(0.5, 0.45, 1.5), body, 0, 0.55, 0);
  add(new THREE.BoxGeometry(0.42, 0.18, 0.8), seat, 0, 0.86, 0.2);
  add(new THREE.BoxGeometry(0.5, 0.45, 0.4), body, 0, 0.85, -0.7).rotation.x = 0.3;
  add(new THREE.BoxGeometry(0.7, 0.06, 0.06), seat, 0, 1.1, -0.75);
  for (const z of [-0.75, 0.7]) {
    add(new THREE.CylinderGeometry(0.28, 0.28, 0.16, 12), tyre, 0, 0.28, z).rotation.z = Math.PI / 2;
  }

  // The rider, so the bike reads as ridden rather than parked.
  add(new THREE.BoxGeometry(0.4, 0.6, 0.35), part(PALETTE.rider), 0, 1.3, 0.15);
  add(new THREE.SphereGeometry(0.18, 8, 6), seat, 0, 1.75, 0.15);

  return scooter;
}
