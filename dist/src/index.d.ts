import { Action, Dispatch, Middleware } from 'redux';
export interface NonHeartbeatAction extends Action {
    [extraProp: string]: any;
}
export interface Timestamped {
    timestamp: number;
}
export interface TimestampedAction extends Timestamped {
    action: NonHeartbeatAction;
}
export declare type TimestampedActions = Array<TimestampedAction>;
export interface HeartbeatAction extends Action {
    payload: TimestampedActions;
    meta: Timestamped;
}
export declare const HEARTBEAT_ACTION_TYPE = "@@redux/heartbeat";
export declare type HeartbeatMiddleware = Middleware & HeartbeatAPI;
export interface HeartbeatAPI {
    start(): void;
    pause(): void;
    stop(): void;
    beat(): void;
    flush(): TimestampedActions;
    stethescope(): TimestampedActions;
}
export declare type HeartbeatPredicate<S> = (state: S, action: NonHeartbeatAction) => boolean;
export declare function createHeartbeat<S>(ms?: number, dispatch?: Dispatch<S>, predicate?: HeartbeatPredicate<S>, autostart?: boolean): HeartbeatMiddleware;
export default createHeartbeat;
