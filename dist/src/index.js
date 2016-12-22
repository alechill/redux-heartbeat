"use strict";
exports.HEARTBEAT_ACTION_TYPE = '@@redux/heartbeat';
function heartbeat(ms = 60000, dispatch, predicate = (state, action) => true, autostart = true) {
    let interval, ventrical = [], dispatcher = dispatch;
    const stamp = (action) => ({ timestamp: new Date().valueOf(), action: action }), add = (action) => ventrical.push(stamp(action)), pump = () => ({ type: exports.HEARTBEAT_ACTION_TYPE, payload: flush() }), flush = () => ventrical.splice(0, ventrical.length), beat = () => { dispatcher && dispatcher(pump()) && flush(); }, pause = () => { if (interval !== undefined)
        clearInterval(interval); }, start = () => { interval = setInterval(beat, ms); }, stop = () => { pause() && beat(); }, stethescope = () => ventrical, api = { start, flush, beat, pause, stop, stethescope }, middleware = (api) => {
        if (!dispatcher)
            dispatcher = api.dispatch;
        return (next) => {
            return (action) => {
                if (action.type !== exports.HEARTBEAT_ACTION_TYPE && predicate(api.getState(), action))
                    add(action);
                return next(action);
            };
        };
    }, heartbeatMiddleware = middleware;
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
exports.heartbeat = heartbeat;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = heartbeat;
//# sourceMappingURL=index.js.map