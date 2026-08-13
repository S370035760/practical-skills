# Reconstruction and Output Contract

## Contents

- [Geometry selection](#geometry-selection)
- [Parameter and module contract](#parameter-and-module-contract)
- [Preview and editor contract](#preview-and-editor-contract)
- [Validation matrix](#validation-matrix)
- [Fidelity report](#fidelity-report)

## Geometry selection

Choose the simplest representation that preserves the reference silhouette:

| Evidence | Preferred representation | Notes |
|---|---|---|
| Rectangular body | `BoxGeometry` or custom beveled box | Keep bevel explicit and low segment. |
| Round axial body | `CylinderGeometry`, `LatheGeometry`, or ring profile | Put the origin on the rotation axis. |
| Tapered body | `ConeGeometry` or ring profile | Expose top/bottom radius and height. |
| Smooth blob | Low-segment sphere/ellipsoid or hand-built rings | Prefer silhouette over hidden topology. |
| Flat irregular silhouette | `ShapeGeometry`/extrusion or custom `BufferGeometry` | Keep contour points named and editable. |
| Repeated ribs/panels | One prototype in a group, repeated by count/angle | Expose count and radius. |
| Hinged or spinning part | Nested `THREE.Group` | Put the pivot at the real inferred hinge. |

Use normalized units when the reference has no reliable scale. Pick one canonical height/width/depth, document it, and make all other dimensions ratios. For a single image, match the camera-visible contour first. Do not add backside details solely to make the code look more complete.

## Parameter and module contract

Keep the parameter source independent from rendering:

```ts
export type AssetConfig = {
  scale: number;
  detail: number;
  dimensions: Record<string, number>;
  colors: Record<string, string>;
  materials: Record<string, { roughness: number; metalness: number }>;
  motion: { enabled: boolean; speed: number; amplitude?: number };
};

export const defaultAssetConfig: AssetConfig = { /* concrete defaults */ };

export function createReferenceAsset(config: AssetConfig): THREE.Group;
export function disposeReferenceAsset(root: THREE.Object3D): void;
```

The exact `dimensions` keys depend on the object, but they must use semantic names such as `bodyWidth`, `bodyHeight`, `stemRadius`, or `panelCount`. Do not expose vertex-index numbers as the primary user API.

Use an optional `updateReferenceAsset(root, config)` only when the update can safely dispose and replace changed geometry. Otherwise remove the old root and call the factory. Always dispose `BufferGeometry` and materials that are no longer used.

## Preview and editor contract

The CDN preview should be self-contained but should mirror the Vite module’s conceptual output. Minimum controls:

```text
Reset View | Wireframe | Animate | Reset Asset | Copy Config
scale | detail | key dimensions | primary colors | roughness | motion speed
```

Use pointer/touch-friendly controls and readable labels. Avoid a framework for the single-file preview. The Vite version may use native HTML controls or a small UI library already present in the project, but adding a UI dependency is not required.

The editor should show the current serialized configuration so a user can copy a chosen variant. Keep editor state separate from scene state, and route updates through one function. If a parameter is not visibly useful for the current object, omit it.

## Validation matrix

| Check | Evidence | Failure response |
|---|---|---|
| Code-only | No prohibited model imports; geometry factory is readable | Replace asset import with explicit geometry code. |
| CDN load | HTTP preview renders without console errors | Fix CDN versions, module paths, or server assumptions. |
| Interaction | Orbit, zoom, reset, wireframe and resize work | Fix event listeners and camera/aspect handling. |
| Editor | A changed control visibly changes the asset | Route all controls through the shared config and factory/update path. |
| Animation | Toggle and reset work without rebuilding every frame | Animate named groups or transforms with a clock. |
| Build | Vite TypeScript build exits successfully | Fix types/imports before handoff. |
| Resource life cycle | Repeated edits do not leak old geometry/materials | Dispose replaced resources. |
| Fidelity honesty | Observed/inferred/unresolved sections exist | Remove unsupported claims and expose uncertainty as parameters. |

Prefer a local HTTP server for validation. A `file://` success is not sufficient when modules, CDN imports, or browser security policies are involved.

## Fidelity report

Use this structure in the final handoff:

```text
Reference: <file or attachment>
Style target: low-poly

observed
- <directly visible contour or component>

inferred
- <symmetry, hidden connection, or depth assumption>

unresolved
- <backside, internal, true dimensions, or material uncertainty>

Generated
- preview/index.html
- vite/src/asset/ReferenceAsset.ts
- vite/src/asset/assetConfig.ts
- vite/src/editor/AssetEditor.ts

Validation
- CDN preview: <command/result>
- Vite build: <command/result>
- Controls: <verified interactions>
```

