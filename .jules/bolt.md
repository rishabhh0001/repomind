## 2024-09-04 - ReactMarkdown Render Loop Optimization
**Learning:** Defining the `components` object inline in `ReactMarkdown` causes massive re-renders in chat applications where state (like keystrokes) updates frequently, because React recreates new function references on every render, leading to full unmounts/remounts of the Markdown tree.
**Action:** Always extract the `components` object outside of the render loop when using `ReactMarkdown` in interactive components.

## 2024-09-04 - React Flow Node Optimization
**Learning:** React Flow re-renders nodes frequently during interactions (like panning/zooming or selecting). Unmemoized custom nodes cause severe performance degradation as the graph grows.
**Action:** Always wrap custom nodes with `React.memo` in React Flow integrations.
