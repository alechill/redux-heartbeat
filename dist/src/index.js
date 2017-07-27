"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEARTBEAT_ACTION_TYPE = '@@redux/heartbeat';
exports.DEFAULT_HEATBEAT_NAME = 'heartbeat';
function createHeartbeat(ms = 30000, dispatch, predicate = (state, action) => true, autostart = true, name = exports.DEFAULT_HEATBEAT_NAME) {
    let interval;
    let dispatcher = dispatch;
    const ventrical = [];
    const now = () => new Date().valueOf();
    const stamp = (action) => ({ timestamp: now(), action });
    const add = (action) => ventrical.push(stamp(action));
    const stethescope = () => ventrical;
    const pump = () => ({
        type: exports.HEARTBEAT_ACTION_TYPE,
        payload: flush(),
        meta: {
            timestamp: now(),
            name
        }
    });
    const flush = () => ventrical.splice(0, ventrical.length);
    const beat = () => { if (!!dispatcher)
        dispatcher(pump()); };
    const pause = () => { if (interval !== undefined)
        clearInterval(interval); };
    const start = () => { interval = setInterval(beat, ms); };
    const stop = () => {
        pause();
        beat();
    };
    const api = { start, flush, beat, pause, stop, stethescope };
    const middleware = (api) => {
        if (!dispatcher)
            dispatcher = api.dispatch;
        return (next) => {
            return (action) => {
                if (action.type !== exports.HEARTBEAT_ACTION_TYPE && predicate(api.getState(), action)) {
                    add(action);
                }
                return next(action);
            };
        };
    };
    const heartbeatMiddleware = middleware;
    heartbeatMiddleware.start = api.start;
    heartbeatMiddleware.flush = api.flush;
    heartbeatMiddleware.beat = api.beat;
    heartbeatMiddleware.pause = api.pause;
    heartbeatMiddleware.stop = api.stop;
    heartbeatMiddleware.stethescope = api.stethescope;
    if (autostart)
        start();
    return heartbeatMiddleware;
}
exports.createHeartbeat = createHeartbeat;
exports.default = createHeartbeat;
//# sourceMappingURL=index.js.map