## Context

We are considering an extensible solution for markdown TextualDescriptions View annotation in JBrowse 2, emphasising:

- Editing markdown stored on Nextcloud (WebDAV) and served via rclone (HTTP).
- Future-proofing for collaborative editing (Yjs) without immediate implementation.
- JBrowse 2 UI-to-editor interactivity, lock/version safety, and avoiding duplicate state management.
- Decoupled architecture to enable both plugin and standalone usage.

The current TextualDescriptions View is read-only, displaying formatted markdown from URLs with good modular architecture but lacking editing infrastructure. Exploration confirms feasibility of adding editability, with key additions needed for persistence, state management, and user interface.

***

## Major Considerations & Options

### 1. **Data access and persistence**

- **Reading**: rclone serve http exposes Nextcloud files over HTTP, with built-in read caching for performance.
- **Writing**: rclone serve http is read-only; edits must be pushed to Nextcloud via WebDAV PUT.
- URL-agnosticism: Both plugin and standalone can operate on two distinct endpoints (readUrl, writeUrl), allowing seamless swap between backends.

**Exploration Findings**: WebDAV standards (RFC 4918) provide robust mechanisms for file updates via HTTP PUT. Conditional PUT with ETag or Last-Modified headers ensures safety against overwrites. Nextcloud supports this natively, triggering versioning on PUT. Integration challenges include browser CORS and authentication via app-passwords over HTTPS.

### 2. **Markdown Editor Selection**

- **Milkdown**: Offers robust WYSIWYG markdown editing, built on ProseMirror. Easily embedded in JBrowse views or standalone pages.
- **Yjs/valtio**: Milkdown supports collaborative editing via the collab plugin (using Yjs). Valtio can make CRDT state more ergonomic for React, but offers little benefit unless complex app-wide state sharing or multi-pane editors are planned. Not needed for non-collab setups.

**Exploration Findings**: Milkdown is a plugin-driven WYSIWYG markdown editor framework with 10.5k GitHub stars, built on ProseMirror and Remark for rich editing capabilities. It provides a composable architecture where functionality is delivered through plugins, enabling customised rich text editing experiences that convert between markdown and rich text. The system is organised as a pnpm monorepo with core packages (@milkdown/core, @milkdown/prose, @milkdown/ctx, @milkdown/transformer), plugins (@milkdown/preset-commonmark, @milkdown/preset-gfm), UI components (@milkdown/components, @milkdown/crepe), and framework integrations. Data flow processes markdown through stages with plugins intercepting transformations. Key technologies include ProseMirror for editing engine, Remark/Unified for parsing, TypeScript for type safety, Vue 3/React support, and tools like pnpm, Rollup, Vite, and Playwright. It supports React integration with hooks and components, making it suitable for JBrowse 2. Key features include extensible plugins for custom components (e.g., code blocks, images, tables), syntax highlighting via plugins like Shiki, and a headless design for flexible UI assembly. Pros include high customisability and WYSIWYG rendering; cons include steep learning curve for UI setup. Examples repository (https://github.com/Milkdown/examples) provides practical implementations for components like code-block, image-block, and table-block. Playground (https://milkdown.dev/playground) allows interactive testing. Getting started guide (https://milkdown.dev/docs/guide/getting-started) offers recipes for React embedding. Alternatives like Tiptap or BlockNote offer more out-of-the-box features but may require more customisation. Evidence from Milkdown documentation (milkdown.dev) and GitHub supports embedding in React components with state management hooks.

### 3. **Collaboration & Versioning**

- **Current need**: No real-time collaboration.
- **Decided**: Milkdown will be used *without Yjs/collab plugin* for now. This makes the editor simpler and reduces plumbing and authentication complexity.
- **Future-proofed**: When multi-user editing is later desired, enable Milkdown collab plugin and add a Yjs provider. The save logic can remain as is.

**Exploration Findings**: For non-collaborative setups, Milkdown's history plugin suffices for local undo/redo. Nextcloud's built-in versioning handles post-save recovery. Broader strategies include operational transformation (OT) or CRDTs for future collaboration. Evidence from RFC 3253 (WebDAV versioning) and Nextcloud docs confirms automatic versioning on PUT, with endpoints for history and restoration.

### 4. **Undo/Redo & File Versioning**

- **Undo/Redo**: Milkdown offers local undo/redo via its history plugin—no need for Yjs. This covers in-session mistakes before any save.
- **Nextcloud versioning**: File history is triggered on PUT; Nextcloud's built-in versioning available for post-save recovery, with restore and version listing endpoints.

**Exploration Findings**: Milkdown's ProseMirror-based history provides granular undo/redo. Integration with JBrowse's MST avoids state conflicts. For versioning, Nextcloud's PROPFIND and restore endpoints enable recovery. Challenges include handling large histories and user prompts for version selection.

### 5. **Concurrency Safety**

- **Mod-time/Etag checks**: Implement conditional PUT (with If-Match header or If-Unmodified-Since) to avoid overwriting concurrent edits; prompt user for reload/diff/"save as copy" on HTTP 412 errors.

**Exploration Findings**: Conditional PUT with ETag/Last-Modified is standard (RFC 7232). On 412 errors, UI prompts for conflict resolution (reload, diff, save as copy) are essential. Optional DAV LOCK/UNLOCK adds workflow safety. Evidence from WebDAV implementations shows this prevents data loss in multi-user scenarios.

### 6. **JBrowse 2 Interactivity**

- **Session state (MST)**: Use MobX-State-Tree (MST) fields in the plugin View model to enable one-direction signals from JBrowse UI into the editor (e.g. feature right-click writes a tag/flag/note).
- **Pattern**: The editor reacts to MST data, updating its markdown accordingly. No feedback flows from the editor back to JBrowse state, avoiding cycles and state conflicts.
- **Menu extension**: Extend display contextMenuItems to allow UI-driven markdown updates (e.g. "Add tag to notes", "Append feature note").

**Exploration Findings**: MST integration aligns with JBrowse's state management, enabling signals without bidirectional flow. Context menu extensions follow JBrowse's pluggable patterns. Challenges include isolating editor state to prevent conflicts with session data.

### 7. **Locking**

- **Optional**: Nextcloud exposes DAV LOCK/UNLOCK endpoints for explicit file locks during editing, adding human workflow safety beyond conflict checks.

**Exploration Findings**: DAV LOCK provides exclusive or shared locks with timeouts. Useful for sequential editing but optional to avoid blocking. Implementation requires lock token management. Evidence from RFC 4918 supports this for WebDAV-compliant servers.

### 8. **Deployment**

- **Plugin and standalone parity**: The editor component operates identically inside JBrowse2 or standalone, taking URLs and auth config as props/inputs.

**Exploration Findings**: Decoupled architecture ensures reusability. URL-agnostic design allows flexible backends. Integration with JBrowse's plugin system requires adherence to pluggable element types.

***

## Architectural Plan (as decided)

| Layer | Details |
| :-- | :-- |
| **View** | JBrowse2 plugin renders Milkdown (no Yjs, with history plugin for undo/redo). |
| **Read** | GET from rclone serve http (readUrl) for cached, fast markdown loading. |
| **Write** | PUT to Nextcloud WebDAV (writeUrl), using conditional requests to avoid overwrites and trigger Nextcloud versioning. |
| **Undo** | Milkdown history plugin for instant local undo/redo; Nextcloud versioning for post-save history. |
| **Concurrency** | ETag/If-Match or Last-Modified/If-Unmodified-Since provided on each PUT; file locked server-side if desired. |
| **JBrowse2 UI→Editor** | Extend display context menus; JBrowse MST fields push tagged/structured insertions into the editor, which applies deterministic markdown edits on input. No editor→JBrowse interaction. |
| **Auth** | Use Nextcloud app-password (Basic), over HTTPS. |
| **Extensibility** | When collaboration is needed, enable Milkdown collab plugin and provide a Yjs provider—not changing the data flow logic. |
| **Outside JBrowse** | Same editor logic in a standalone React component, using the same GET/PUT and concurrency checks. |

**Updated with Exploration Evidence**: The plan is feasible based on Milkdown's React support and WebDAV standards. Alternatives like BlockNote could simplify UI if Milkdown's headless nature proves challenging. Testing with Nextcloud is recommended to validate conditional PUT and versioning.

***

## Final Decisions

- Avoid collaborative editing and Yjs for now, keeping editor architecture simple and secure.
- Use Milkdown (with history, without collab) for rich markdown editing and local undo.
- Ensure write safety with ETag/mod-time preconditions on PUT and leverage Nextcloud's versioning for saved revisions.
- Use JBrowse2's MST for all state sharing signals into the editor, aligned with app session management—no Valtio/proxy state needed.
- Provide a clean, maintainable path for future migration to collaborative editing (Milkdown collab & Yjs) if required.
- Maintain complete URL/back-end agnosticism for flexibility in deployment.

**Additional Recommendations from Exploration**:
- Start with a prototype integrating Milkdown into the TextualDescriptions View, adding edit mode toggle and save functionality.
- Implement conflict resolution UI for 412 errors, with options for reload, diff, or save as copy.
- Review Milkdown's examples (https://github.com/Milkdown/examples) and playground (https://milkdown.dev/playground) for integration patterns.
- Consider BlockNote as an alternative for faster deployment with pre-built UI.
- Ensure comprehensive testing for browser compatibility, authentication security, and performance impacts on JBrowse views.

***

This expanded document provides a comprehensive, evidence-based guide for implementing editable markdown in the TextualDescriptions View. It incorporates findings from the exploration, ensuring the approach is practical and aligned with JBrowse 2 best practices.