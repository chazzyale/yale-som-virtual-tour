// Shared between the 3D scene and the chat UI. Read every frame, so it's a plain object rather than React state.
//   targets: professor id -> { obj: THREE.Object3D, name } for avatars you can click to chat with
//   with:    id of the professor you're chatting with (null when no chat is open)
//   replyAt: clock time of the last reply, so the avatar can gesture while "talking"
export const talk = { targets: new Map(), with: null, replyAt: -99 }

// The FastAPI backend (backend/). In dev, Vite proxies /api to it; set VITE_API_URL to point elsewhere.
export const API = import.meta.env.VITE_API_URL ?? ''
