# Houseform — Home design studio

A local browser editor for concept house designs. The app starts with a blank ground floor.

## Run

Install Node.js, then run `npm install` and `npm run dev` in this folder. Open the localhost URL printed by Vite. On Windows, `start-room.bat` also starts the editor.

## Design tools

- Add, rename, resize, and delete floor levels. Set floor heights, finishes, and optional full floor slabs.
- Create rooms, individual walls, floor surfaces, doors, windows, columns, stairs, roof sections, and custom blocks.
- A room creates a surface and four attached walls. Walls follow its dimensions and rotation, and can be detached for independent editing.
- Doors and windows placed near walls attach and cut openings. Adjust their offset and sill height in Properties. Overlapping openings are merged when generating wall geometry.
- Add beds, sofas, backless daybeds, tables, chairs, wardrobes, shelves, clothing racks, kitchen fixtures, bathroom fixtures, carpets, plants, lights, and screens.
- Move items by dragging. Set dimensions, elevation, rotation, level, and materials with exact numeric fields. Duplicate or delete any item.
- View the plan in 2D or orbit in 3D. Stack all floors in 3D, snap placement to 0.25 m, and fit the design to the screen.
- Create, edit, apply, and delete materials with solid, wood, tile, brick, or fabric textures; change color, roughness, metalness, and transparency.
- Undo/redo changes. Projects autosave in this browser. Export/import Houseform JSON files for backups or sharing.

Keyboard: Delete removes selection, Ctrl+D duplicates, Ctrl+Z undoes, Ctrl+Shift+Z redoes, Escape cancels placement. In 3D, left-drag empty space to orbit, right-drag to pan, and scroll to zoom.

## Verify

`npm test` runs model tests. `npm run build` creates the production site in `dist`. `npm run test:browser` runs an isolated headless Chrome smoke test against the dev server (Windows Chrome path; screenshots saved in `.test-artifacts`).

This is a concept editor with parametric furniture models and rectangular rooms/surfaces, not a structural engineering or construction-documentation system. Wall openings use wall-local rectangular cuts. Floors stack by the heights you specify. The furniture library can be extended in `model.js` and `renderer.js`. Custom blocks and materials allow additional forms and finishes.

The app stores designs locally and does not upload them. The optional interface fonts load from Google Fonts; system fonts work offline.
