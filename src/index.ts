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

export function createHeartbeat<S>(ms: number = 30000,
                                   dispatch?: Dispatch<S>,
                                   predicate: HeartbeatPredicate<S> =
                                     (state: S, action: Action): boolean => true,
                                   autostart: boolean = true,
                                   name: string = DEFAULT_HEATBEAT_NAME
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
          // always filter out heartbeat actions, and any denied by predicate
          if (action.type !== HEARTBEAT_ACTION_TYPE && predicate(middlewareApi.getState(), action)) add(action)
          return next(action)
        }
      }
    }
  // FIXME - This is nasty... getting Object.assign working may be cleaner
  const heartbeatMiddleware: any = middleware
  heartbeatMiddleware.start = api.start
  heartbeatMiddleware.flush = api.flush
  heartbeatMiddleware.beat = api.beat
  heartbeatMiddleware.pause = api.pause
  heartbeatMiddleware.stop = api.stop
  heartbeatMiddleware.stethescope = api.stethescope
  if (autostart) start()
  return heartbeatMiddleware as HeartbeatMiddleware
}

export default createHeartbeat
