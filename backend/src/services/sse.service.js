import { EventEmitter } from "events";

const emitter = new EventEmitter();
emitter.setMaxListeners(500);

export const emitToStudent = (studentId, event, data) => {
  emitter.emit(`student:${String(studentId)}`, { event, data });
};

export const subscribeStudent = (studentId, listener) => {
  const channel = `student:${String(studentId)}`;
  emitter.on(channel, listener);
  return () => emitter.off(channel, listener);
};
