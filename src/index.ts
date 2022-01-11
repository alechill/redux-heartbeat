import {
  Action,
  AnyAction,
  Dispatch,
  Middleware,
  MiddlewareAPI
} from 'redux'

export interface HeartbeatMeta extends Timestamped {
  name: string
}

export interface Timestamped {
  timestamp: number
}

export interface TimestampedAction extends Timestamped {
  action: AnyAction
}

export type TimestampedActions = TimestampedAction[]

// The action that the heartbeat dispatches, follows FSA with the collated actions as payload
export interface HeartbeatAction extends Action {
  payload: TimestampedActions
  meta: HeartbeatMeta
}

export const HEARTBEAT_ACTION_TYPE = '@@redux/heartbeat'

// A name to allow distinguishing the originator of a heartbeat action if more than one heartbeat is set up
export const DEFAULT_HEATBEAT_NAME = 'heartbeat'

export type HeartbeatMiddleware = Middleware & HeartbeatAPI

export interface HeartbeatAPI {
  start(): void // start the heartbeat
  pause(): void // stop the heartbeat (leaving any collated actions intact)
  stop(): void // stop the heartbeat (flushing any collated actions and dispatching them in a final heartbeat action)
  beat(): void // manually cause a hearbeat action to be dispatched containing any collated actions
  flush(): TimestampedActions // flush the collated actions
  stethescope(): TimestampedActions // inspect any collated actions that will be in next beat without flushing them
}

// Predicate is a developer specified function that gets passed the state and each action as they pass
// through middleware.
// Should perform any checks needed to determine if the action should be collated into the heartbeat.
// If returns false will not be added, default is true for all.
// Heartbeat actions themselves are always ignored, so no need to filter them out in a custom predicate
export type HeartbeatPredicate<S> = (state: S, action: Action) => boolean

// Transform is a developer specified function that gets passed the state and each action as they pass
// through middleware.
// Its purpose is to allow transformation/augmentation/redaction on collated actions.
// For performance it is delegated to the developer to decide upon and enforce immutability.
export type HeartbeatTransform<S> = (state: S, action: Action) => AnyAction

export function createHeartbeat<S>(ms: number = 30000,
                                   dispatch?: Dispatch<S>,
                                   predicate: HeartbeatPredicate<S> =
                                     (state: S, action: Action): boolean => true,
                                   autostart: boolean = true,
                                   name: string = DEFAULT_HEATBEAT_NAME,
                                   transform: HeartbeatTransform<S> = (state: S, action: Action): AnyAction => action
                                  ): HeartbeatMiddleware {
  let interval: number
  let dispatcher: Dispatch<S> | undefined = dispatch // eagerly assign if needed to beat before first action occurs

  const ventrical: TimestampedActions = []
  const now = (): number => Date.now()
  const timestamp = (action: Action): TimestampedAction => ({ timestamp: now(), action })
  const add = (action: Action) => ventrical.push(timestamp(action))
  const stethescope = (): TimestampedActions => ventrical
  const pump = (): HeartbeatAction => ({
    type: HEARTBEAT_ACTION_TYPE,
    payload: flush(),
    meta: {
      timestamp: now(),
      name
    }
  })
  const flush = (): TimestampedActions => ventrical.splice(0, ventrical.length)
  const beat = (): void => { if (!!dispatcher) dispatcher(pump()) }
  const pause = (): void => { if (interval !== undefined) clearInterval(interval) }
  const start = (): void => { interval = setInterval(beat, ms) }
  const stop = (): void => {
    pause()
    beat()
  }
  const api: HeartbeatAPI = {start, flush, beat, pause, stop, stethescope}
  const middleware: Middleware = (middlewareApi: MiddlewareAPI<S>) => {
    if (!dispatcher) dispatcher = middlewareApi.dispatch // cache dispatch so can be used to send the collated action
    return (next: Dispatch<S>): Dispatch<S> => {
      return (action: Action) => {
        if (action.type !== HEARTBEAT_ACTION_TYPE) {
          const state = middlewareApi.getState()
          if (predicate(state, action)) add(transform(state, action))
        }
        return next(action)
      }
    }
  }
  const heartbeatMiddleware = middleware as HeartbeatMiddleware
  heartbeatMiddleware.start = api.start
  heartbeatMiddleware.flush = api.flush
  heartbeatMiddleware.beat = api.beat
  heartbeatMiddleware.pause = api.pause
  heartbeatMiddleware.stop = api.stop
  heartbeatMiddleware.stethescope = api.stethescope
  if (autostart) start()
  return heartbeatMiddleware
}

export default createHeartbeat
