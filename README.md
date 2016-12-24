```      
                                 ____    ____  
              ____    ____      /    \  /    \      ____    ____
             /    \  /    \    |      \/      |    /    \  /    \
            |      \/      |   |              |   |      \/      |
             \            /     \            /     \            /
               \        /         \        /         \        /
                 \    /             \    /             \    /  
                   \/                 \/                 \/

```
[![Build Status](https://tra|vis-ci.org/alechill/redux-heartbeat.svg?branch=master)](https://travis-ci.org/alechill/redux-heartbeat) [![npm version](https://badge.fury.io/js/redux-heartbeat.svg)](https://badge.fury.io/js/redux-heartbeat)

A middleware for Redux providing a heartbeat that contains batched log of actions occurring between each beat.

Created for incrementally collecting usage data for driving analytics, contextual error reporting, even persisting replayable user sessions.

Redux-heartbeat makes no assumptions as to what you will be doing with the heartbeat's contents. It is itself dispatched as an ordinary redux action so you can handle it however you like... log it, send to server, store to disk, send to your 3rd party metrics service, mirror a user's session for support, whatever!

##Installation

```
npm install --save redux-heartbeat
```

##Usage

###Basic usage

In the simplest of cases you will want just set the heartbeat up with your store and leave it to happily beat away...

```js
import { createStore, applyMiddleware } from 'redux'
import createHeartbeat from 'redux-heartbeat'
import rootReducer from './reducers'

const store = createStore(
  rootReducer,
  applyMiddleware(createHeartbeat())
)
```

This will cause an FSA compliant action to be dispatched each time the heartbeat duration has passed (default is 30seconds, but can be overridden). The heartbeat action will have the following shape...

```js
{
  type: '@@redux/heartbeat',
  payload: [
    {
      timestamp: 1234567890,
      action: { type: 'your arbitrary action' }
    },
    // more arbitrary actions...  
  ],
  meta: {
    timestamp: 1234567890
  }
}
```

Of course you will want to handle the heartbeat actions themselves to make them useful. This is not prescribed by redux-heartbeat as you could do many things with the heartbeat contents, and you should do so using whatever side effect handling that fits best for your application.

Here is a fictional example using redux-saga middleware to respond to the heartbeat action by logging, sending it via an arbitrary async service, storing to disk etc...

```js
import {HEARTBEAT_ACTION_TYPE} from 'redux-heartbeat'
import {takeEvery} from 'redux-saga'
import {call} from 'redux-saga/effects'
import heartbeatService from './api/heartbeat-service' // some arbitrary async service
import * as fs from 'fs' // filesystem if on node

export function* watchHeartbeat() {
  yield call(takeEvery, HEARTBEAT_ACTION_TYPE, performHeartbeat)
}

export function* handleHeartbeat(heartbeatAction) {
  try {
    // log it...
    console.log('Actions since last heartbeat', heartbeatAction.payload)
    // send it...
    yield call(heartbeatService.send, heartbeatAction.payload, heartbeatAction.meta.timestamp))
    // write actions to a file...
    yield call(fs.writeFile, `beat_log_${heartbeatAction.meta.timestamp}`, JSON.stringify(heartbeatAction.payload))
  } catch (e) {
    console.error({err: e}, 'Oops')
  }
}
```

###Advanced usage

If you have more than just a trivial application then you will want greater control over what the heartbeat is doing.

#### Overriding default settings

At initialisation you have certain defaults that can be overridden...

```ts
createHeartbeat<S>(ms: number = 60000,
                   dispatch?: Dispatch<S>,
                   predicate: HeartbeatPredicate<S> = (state: S, action: NonHeartbeatAction): boolean => true,
                   autostart: boolean = true): HeartbeatMiddleware
```

You can override the default duration in milliseconds
```js
createHeartbeat(10000)
```

Override dispatch, perhaps passing a thunk to handle the heartbeat action itself...
```js
createHeartbeat(null,
  (action) => {
    if (action.type === HEARTBEAT_ACTION_TYPE) myAwesomeHeartbeatService.send(action.payload)
    return dispatch(action)
  }
})
```

Defining a predicate function to determine if an action should be collated in the heartbeat, useful to filter out noise. This gets passed the state and the action, so you can cross reference anything in state, or simply filter out certain uninteresting actions.
If the predicate returns `true` it will be collated, if it returns `false` it will be ignored by the heartbeat (by default every action will be collated).

N.B. The heartbeat action will never be added to the heartbeat itself, so there is no need to filter this in your overridden predicate.
```js
createHeartbeat(null, null,
  (state, action) => action.type !== 'I am so dull'
)
```

Deferring the autostart...
```js
createHeartbeat(null, null, null, false)
```

####Complete control over heartbeat lifecycle

In a real world app you will often need further control over the complete lifecycle of the heartbeat.

When you create a heartbeat it returns a `HeartbeatMiddleware` instance that has a public `HeartbeatAPI` that can be used to have further control over it. Simply store a reference to it before passing to the store, then you can call methods on it whenever you like...
```js
import { createStore, applyMiddleware } from 'redux'
import createHeartbeat from 'redux-heartbeat'
import rootReducer from './reducers'

const heartbeat = createHeartbeat()

const store = createStore(
  rootReducer,
  applyMiddleware(heartbeat)
)

// now can interact with it...
heartbeat.pause()
```

The methods you can use...
```ts
interface HeartbeatAPI {
  start(): void                      // start the heartbeat
  pause(): void                      // stop the heartbeat (leaving any collated actions intact)
  stop(): void                       // stop the heartbeat (flushing any collated actions and dispatching them in a final heartbeat action)
  beat(): void                       // manually cause a hearbeat action to be dispatched containing any collated actions, flushing them at same time
  flush(): TimestampedActions        // flush the collated actions
  stethescope(): TimestampedActions  // inspect any collated actions that will be in next beat without flushing them
}
```

Take for example a logged in user session. When a user logs out you would not want the previous user's unbeated actions to remain in the collated list, as a subsequent user may incorrectly have them attributed to them instead, or worse could inspect or alter the final actions of a previous user.

In this case it would be wise to manually force a beat when when the user logs out, so there is a clean slate for the next

```js
myLogoutHandler() {
  // force last actions of user to be flushed and reported
  heartbeat.beat()
  // before actually logging them out
  myLogoutService.logout()
}
```

## Language

Redux-heartbeat is written in Typescript, and only has dependencies on redux types. Its own typings are available via the npm package

It is compiled down to ES6 - if you need support for lower versions please use babel in your own build to do so

##License
MIT
