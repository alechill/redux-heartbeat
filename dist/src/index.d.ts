import { Action, AnyAction, Dispatch, Middleware } from 'redux';
export interface HeartbeatMeta extends Timestamped {
    name: string;
}
export interface Timestamped {
    timestamp: number;
}
export interface TimestampedAction extends Timestamped {
    action: AnyAction;
}
export declare type TimestampedActions = TimestampedAction[];
export interface HeartbeatAction extends Action {
    payload: TimestampedActions;
    meta: HeartbeatMeta;
}
export declare const HEARTBEAT_ACTION_TYPE = "@@redux/heartbeat";
export declare const DEFAULT_HEATBEAT_NAME = "heartbeat";
export declare type HeartbeatMiddleware = Middleware & HeartbeatAPI;
export interface HeartbeatAPI {
    start(): void;
    pause(): void;
    stop(): void;
    beat(): void;
    flush(): TimestampedActions;
    stethescope(): TimestampedActions;
}
export declare type HeartbeatPredicate<S> = (state: S, action: Action) => boolean;
export declare type HeartbeatTransform<S> = (state: S, action: Action) => AnyAction;
export declare function createHeartbeat<S>(ms?: number, dispatch?: Dispatch<S>, predicate?: HeartbeatPredicate<S>, autostart?: boolean, name?: string, transform?: HeartbeatTransform<S>): HeartbeatMiddleware;
export default createHeartbeat;
