// Only explicitly enrolled rooms use logical time. Ordinary matches keep native timers.
const clocks = new WeakMap();
const tasks = new WeakMap();
const system = {now: () => Date.now(), setTimeout: (...args) => setTimeout(...args), clearTimeout: handle => clearTimeout(handle)};

export function enableRoomTimeline(room, driver = system, {turnsTimed = true, restore = null} = {}) {
  if (clocks.has(room)) throw Error('A sala já possui um relógio controlado.');
  const now = driver.now();
  if (!Number.isFinite(now)) throw Error('Relógio inválido.');
  if (restore && (!Number.isFinite(restore.now) || !Number.isInteger(restore.epoch))) throw Error('Relógio salvo inválido.');
  clocks.set(room, {driver, logical: restore?.now ?? now, anchor: now, paused: Boolean(restore), epoch: restore ? restore.epoch + 1 : 0, turnsTimed, pending: new Set()});
}
export function roomTurnsTimed(room) { return clocks.get(room)?.turnsTimed !== false; }

export function roomNow(room) {
  const clock = clocks.get(room);
  return !clock ? Date.now() : clock.paused ? clock.logical : clock.logical + clock.driver.now() - clock.anchor;
}

export function roomIsPaused(room) { return clocks.get(room)?.paused === true; }
export function roomTimelineView(room) {
  const clock = clocks.get(room);
  return clock ? {paused: clock.paused, disposed: Boolean(clock.disposed), turnsTimed: clock.turnsTimed, epoch: clock.epoch, now: roomNow(room)} : null;
}

function disarm(task) {
  task.generation++;
  if (task.handle !== null) task.clock.driver.clearTimeout(task.handle);
  task.handle = null;
}

function arm(task) {
  if (task.cancelled || task.clock.paused) return;
  const generation = ++task.generation;
  task.handle = task.clock.driver.setTimeout(() => {
    if (task.cancelled || task.clock.paused || task.generation !== generation) return;
    task.handle = null;
    task.clock.pending.delete(task);
    task.cancelled = true;
    task.callback();
  }, Math.max(1, task.due - roomNow(task.room)));
  if (task.unreferenced) task.handle?.unref?.();
}

export function setRoomTimeout(room, callback, delay) {
  const clock = clocks.get(room);
  if (!clock) return setTimeout(callback, delay);
  if (clock.disposed) throw Error('O relógio desta sala foi encerrado.');
  const task = {room, clock, callback, due: roomNow(room) + Math.max(1, Number(delay) || 0),
    handle: null, generation: 0, cancelled: false, unreferenced: false};
  // Public handles have no callbacks and remain serializable in engine snapshots.
  const handle = {};
  Object.defineProperty(handle, 'unref', {value() { task.unreferenced = true; task.handle?.unref?.(); return handle; }});
  tasks.set(handle, task);
  clock.pending.add(task);
  arm(task);
  return handle;
}

export function clearRoomTimeout(room, handle) {
  const task = handle && typeof handle === 'object' ? tasks.get(handle) : null;
  if (!task) { clearTimeout(handle); return; }
  if (task.room !== room) throw Error('O temporizador pertence a outra sala.');
  task.cancelled = true;
  disarm(task);
  task.clock.pending.delete(task);
}

export function pauseRoomTimeline(room) {
  const clock = clocks.get(room);
  if (!clock) throw Error('Esta sala não permite pausa de tutorial.');
  if (clock.disposed) throw Error('O relógio desta sala foi encerrado.');
  if (clock.paused) return false;
  clock.logical = roomNow(room);
  clock.paused = true;
  clock.epoch++;
  for (const task of clock.pending) disarm(task);
  return true;
}

export function resumeRoomTimeline(room) {
  const clock = clocks.get(room);
  if (!clock) throw Error('Esta sala não permite pausa de tutorial.');
  if (clock.disposed) throw Error('O relógio desta sala foi encerrado.');
  if (!clock.paused) return false;
  clock.anchor = clock.driver.now();
  clock.paused = false;
  clock.epoch++;
  for (const task of clock.pending) arm(task);
  return true;
}

export function disposeRoomTimeline(room) {
  const clock = clocks.get(room);
  if (!clock) return;
  clock.logical = roomNow(room);
  clock.paused = true;
  clock.disposed = true;
  clock.epoch++;
  for (const task of clock.pending) { task.cancelled = true; disarm(task); }
  clock.pending.clear();
  // Keep a tombstone until the room is collected: late async results stay blocked.
}
