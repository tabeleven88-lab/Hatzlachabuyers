// /js/store.js

// /js/store.js

export const state = {
  donationContext: null
};

const listeners = [];

export function setState(newState) {
  Object.assign(state, newState);

  listeners.forEach(cb => cb(state));
}

export function getState() {
  return state;
}

export function subscribe(callback) {
  listeners.push(callback);

  // 🔥 THIS IS THE FIX
  callback(state);
}