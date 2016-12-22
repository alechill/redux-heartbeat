import {Action, Dispatch, MiddlewareAPI, Middleware} from 'redux'

// can't trust that 3rd party actions will follow FSA, or will of course have extra props unknown here
// so will type them as an Action with potentially any other props
export interface NonHeartbeatAction extends Action {
  [extraProp: string]: any
}

export interface Timestamped {
  timestamp: number
}

export interface TimestampedAction extends Timestamped {
  action: NonHeartbeatAction
}

export type TimestampedActions = Array<TimestampedAction>

// The action that the heartbeat dispatches, follows FSA with the collated actions as payload
export interface HeartbeatAction extends Action {
  payload: TimestampedActions
  meta: Timestamped
}

export const HEARTBEAT_ACTION_TYPE = '@@redux/heartbeat'

export type HeartbeatMiddleware = Middleware & HeartbeatAPI

export interface HeartbeatAPI {
  start(): void // start the heartbeat
  pause(): void // stop the heartbeat (leaving any collated actions intact)
  stop(): void // stop the heartbeat (flushing any collated actions and dispatching them in a final heartbeat action)
  beat(): void // manually cause a hearbeat action to be dispatched containing any collated actions
  flush(): TimestampedActions // flush the collated actions
  stethescope(): TimestampedActions // inspect any collated actions that will be in next beat without flushing them
}

// Predicate is a developer specified function that gets passed the state and each action as they pass through middleware.
// Should perform any checks needed to determine if the action should be collated into the heartbeat.
// If returns false will not be added, default is true for all.
// Heartbeat actions themselves are always ignored, so no need to filter them out in a custom predicate
export type HeartbeatPredicate<S> = (state: S, action: NonHeartbeatAction) => boolean

export function createHeartbeat<S>(ms: number = 60000,
                             dispatch?: Dispatch<S>,
                             predicate: HeartbeatPredicate<S> = (state: S, action: NonHeartbeatAction): boolean => true,
                             autostart: boolean = true): HeartbeatMiddleware {
  let
    interval: number,
    ventrical: TimestampedActions = [],
    dispatcher: Dispatch<S> | undefined = dispatch

  const
    now = (): number => new Date().valueOf(),
    stamp = (action: Action): TimestampedAction => ({ timestamp: now() , action: action }),
    add = (action: Action) => ventrical.push(stamp(action)),
    pump = (): HeartbeatAction => ({ type: HEARTBEAT_ACTION_TYPE, payload: flush(), meta: { timestamp: now() } }),
    flush = (): TimestampedActions => ventrical.splice(0, ventrical.length),
    beat = (): void => { dispatcher && dispatcher(pump()) && flush() },
    pause = (): void => { if (interval !== undefined) clearInterval(interval) },
    start = (): void => { interval = setInterval(beat, ms) },
    stop = (): void => { pause() && beat() },
    stethescope = (): TimestampedActions => ventrical,
    api: HeartbeatAPI = {start, flush, beat, pause, stop, stethescope},
    middleware: Middleware = (api: MiddlewareAPI<S>) => {
      if (!dispatcher) dispatcher = api.dispatch
      return (next: Dispatch<S>): Dispatch<S> => {
        return (action: NonHeartbeatAction) => {
          // always filter out heartbeat actions, and any denied by predicate
          if (action.type !== HEARTBEAT_ACTION_TYPE && predicate(api.getState(), action)) add(action)
          return next(action)
        }
      }
    },
    heartbeatMiddleware: any = middleware

  // FIXME - get Object.assign working via babel then this filth can die
  heartbeatMiddleware.start = api.start
  heartbeatMiddleware.flush = api.flush
  heartbeatMiddleware.beat = api.beat
  heartbeatMiddleware.pause = api.pause
  heartbeatMiddleware.stop = api.stop
  heartbeatMiddleware.stethescope = api.stethescope

  if (autostart) start()
  // return mware as HeartbeatMiddleware
  return heartbeatMiddleware as HeartbeatMiddleware
}

export default createHeartbeat
