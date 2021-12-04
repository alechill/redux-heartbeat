"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHeartbeat = exports.DEFAULT_HEATBEAT_NAME = exports.HEARTBEAT_ACTION_TYPE = void 0;
exports.HEARTBEAT_ACTION_TYPE = '@@redux/heartbeat';
exports.DEFAULT_HEATBEAT_NAME = 'heartbeat';
function createHeartbeat(ms, dispatch, predicate, autostart, name, transform) {
    if (ms === void 0) { ms = 30000; }
    if (predicate === void 0) { predicate = function (state, action) { return true; }; }
    if (autostart === void 0) { autostart = true; }
    if (name === void 0) { name = exports.DEFAULT_HEATBEAT_NAME; }
    if (transform === void 0) { transform = function (state, action) { return action; }; }
    var interval;
    var dispatcher = dispatch;
    var ventrical = [];
    var now = function () { return Date.now(); };
    var timestamp = function (action) { return ({ timestamp: now(), action: action }); };
    var add = function (action) { return ventrical.push(timestamp(action)); };
    var stethescope = function () { return ventrical; };
    var pump = function () { return ({
        type: exports.HEARTBEAT_ACTION_TYPE,
        payload: flush(),
        meta: {
            timestamp: now(),
            name: name
        }
    }); };
    var flush = function () { return ventrical.splice(0, ventrical.length); };
    var beat = function () { if (!!dispatcher)
        dispatcher(pump()); };
    var pause = function () { if (interval !== undefined)
        clearInterval(interval); };
    var start = function () { interval = setInterval(beat, ms); };
    var stop = function () {
        pause();
        beat();
    };
    var api = { start: start, flush: flush, beat: beat, pause: pause, stop: stop, stethescope: stethescope };
    var middleware = function (middlewareApi) {
        if (!dispatcher)
            dispatcher = middlewareApi.dispatch;
        return function (next) {
            return function (action) {
                if (action.type !== exports.HEARTBEAT_ACTION_TYPE) {
                    var state = middlewareApi.getState();
                    if (predicate(state, action))
                        add(transform(state, action));
                }
                return next(action);
            };
        };
    };
    var heartbeatMiddleware = middleware;
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