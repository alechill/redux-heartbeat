import {HeartbeatTransform} from './../src/index';
import {expect} from 'chai'
import * as mocha from 'mocha'
import {
  Action,
  AnyAction,
  Dispatch
} from 'redux'
import * as sinon from 'sinon'
import {
  createHeartbeat,
  DEFAULT_HEATBEAT_NAME,
  HEARTBEAT_ACTION_TYPE,
  HeartbeatAction,
  HeartbeatMiddleware,
  TimestampedActions
} from '../src/index'

type Handler<S> = (next: Dispatch<S>) => Dispatch<S>

describe('Redux heartbeat', () => {

  let clock: sinon.SinonFakeTimers

  let dispatch: sinon.SinonStub
  let getState: sinon.SinonStub
  let hb: HeartbeatMiddleware
  const ms = 10000
  const next: sinon.SinonSpy = sinon.spy((action: Action) => action)
  const stubAction: Action = { type: 'foo' }

  interface ArbitraryAction {
    type: string
    payload: string
  }
  const stubActionWithExtraProps: ArbitraryAction = {
    type: 'nic',
    payload: 'cage'
  }

  before(() => {
    // must freeze timers once BEFORE ALL the tests - will be reset inbetween
    clock = sinon.useFakeTimers()
  })

  after(() => {
    clock.restore()
  })

  // common setup teardown per sub-suite
  const setupHeartbeat = () => {
    dispatch = sinon.stub()
    getState = sinon.stub()
    hb = createHeartbeat(ms, dispatch)
  }

  const teardownHeartbeat = () => {
    clock.reset()
  }

  // suite 1 - required redux middleware functionality /////////////////////////

  describe('Given the middleware is created', () => {

    let nextHandler: Handler<any>
    let actionHandler: Dispatch<any>

    before(() => {
      setupHeartbeat()
      nextHandler = hb({dispatch, getState})
    })

    after(teardownHeartbeat)

    it('should be able to compose the next middleware', () => {
      expect(nextHandler).to.be.a('function')
      expect(nextHandler.length).to.be.equal(1)
    })

    describe('When the next middleware is composed', () => {

      before(() => actionHandler = nextHandler(next))

      it('should return a function to handle action', () => {
        expect(actionHandler).to.be.a('function')
        expect(actionHandler.length).to.be.equal(1)
      })

      describe('When an action is handled', () => {

        it('should pass the action to next middleware', () => {
          const handledAction: Action = actionHandler(stubAction)
          expect(next.calledWith(stubAction)).to.be.true
          expect(handledAction).to.be.equal(stubAction)
        })

      })

    })

  })

  // suite 2 - heartbeat action ////////////////////////////////////////////////

  describe('Given actions are passed through the heartbeat middleware', () => {

    // need a ref to the actual action handler to test with actions
    let actionHandler: Dispatch<any>

    before(() => {
      setupHeartbeat()
      actionHandler = hb({dispatch, getState})(next)
      // pass an action through middleware
      actionHandler(stubAction)
    })

    after(teardownHeartbeat)

    it('should start collating actions with timestamp', () => {
      const collated: TimestampedActions = hb.stethescope()
      expect(collated).to.have.length(1)
      expect(collated[0].timestamp).to.be.a('number')
      expect(collated[0].action).to.be.equal(stubAction)
    })

    it('should not dispatch a heartbeat action before duration has passed', () => {
      expect(dispatch.called).to.be.false
    })

    describe('When the heartbeat duration passes', () => {

      before(() => clock.tick(ms))

      describe('Then the heartbeat action', () => {

        it('should have been dispatched', () => {
          expect(dispatch.calledOnce).to.be.true
          const dispatchedAction: HeartbeatAction = dispatch.getCall(0).args[0]
          expect(dispatchedAction.type).to.be.equal(HEARTBEAT_ACTION_TYPE)
        })

        it('should have the previously collated actions as payload', () => {
          const dispatchedAction: HeartbeatAction = dispatch.getCall(0).args[0]
          expect(dispatchedAction.payload).to.have.length(1)
          expect(dispatchedAction.payload[0].timestamp).to.be.a('number')
          expect(dispatchedAction.payload[0].action).to.be.equal(stubAction)
        })

        it('should have the timestamp that the heartbeat occurred at in the meta', () => {
          const dispatchedAction: HeartbeatAction = dispatch.getCall(0).args[0]
          expect(dispatchedAction.meta.timestamp).to.be.equal(ms)
        })

        it('should have the heartbeat name in the meta', () => {
          const dispatchedAction: HeartbeatAction = dispatch.getCall(0).args[0]
          expect(dispatchedAction.meta.name).to.be.equal(DEFAULT_HEATBEAT_NAME)
        })

      })

      describe('And the pending collated actions', () => {

        it('should have been flushed ready to collect more for next heartbeat', () => {
          expect(hb.stethescope()).to.have.length(0)
        })

      })

    })

  })

  // suite 3 - heartbeat lifecycle API /////////////////////////////////////////

  describe('Heartbeat public API', () => {

    // need a ref to the actual action handler to test with actions
    let actionHandler: Dispatch<any>

    describe('Given the heartbeat is started and an action is passed through middleware', () => {

      before(() => {
        setupHeartbeat()
        actionHandler = hb({dispatch, getState})(next)
        // pass an action through middleware
        actionHandler(stubAction)
      })

      after(teardownHeartbeat)

      describe('When collated actions are inspected via `stethescope`', () => {

        it('should return the collated actions without affecting or removing them', () => {
          const collated : TimestampedActions = hb.stethescope()
          expect(collated).to.have.length(1)
          const collated2 : TimestampedActions = hb.stethescope()
          expect(collated2).to.have.length(1)
          expect(collated2).to.be.deep.equal(collated)
        })

      })

      describe('When paused via `pause`', () => {

        before(() => hb.pause())

        describe('Then the pending collated actions', () => {

          it('should not have been removed ', () => {
            expect(hb.stethescope()).to.have.length(1)
          })

        })

        describe('When the heartbeat duration passes', () => {

          before(() => clock.tick(ms))

          describe('Then the heartbeat action', () => {
            it('should not have been dispatched while paused', () => {
              expect(dispatch.called).to.be.false
            })
          })

          describe('When restarted via `start`', () => {

            before(() => {
              dispatch.reset()
              hb.start()
            })

            describe('And the heartbeat duration passes', () => {

              before(() => clock.tick(ms))

              describe('Then the heartbeat action', () => {

                it('should have been dispatched', () => {
                  expect(dispatch.calledOnce).to.be.true
                  const dispatchedAction: HeartbeatAction = dispatch.getCall(0).args[0]
                  expect(dispatchedAction.type).to.be.equal(HEARTBEAT_ACTION_TYPE)
                })

                it('should have the previously collated actions as payload', () => {
                  const dispatchedAction: HeartbeatAction = dispatch.getCall(0).args[0]
                  expect(dispatchedAction.payload).to.have.length(1)
                  expect(dispatchedAction.payload[0].timestamp).to.be.a('number')
                  expect(dispatchedAction.payload[0].action).to.be.equal(stubAction)
                })

              })

              describe('When stopped via `stop` before next beat duration has passed', () => {

                before(() => {
                  dispatch.reset()
                  actionHandler(stubAction)
                  hb.stop()
                })

                describe('Then a final hearbeat action', () => {

                  it('should have been dispatched', () => {
                    expect(dispatch.calledOnce).to.be.true
                    const dispatchedAction: HeartbeatAction = dispatch.getCall(0).args[0]
                    expect(dispatchedAction.type).to.be.equal(HEARTBEAT_ACTION_TYPE)
                  })

                  it('should have the previously collated actions as payload', () => {
                    const dispatchedAction: HeartbeatAction = dispatch.getCall(0).args[0]
                    expect(dispatchedAction.payload).to.have.length(1)
                    expect(dispatchedAction.payload[0].timestamp).to.be.a('number')
                    expect(dispatchedAction.payload[0].action).to.be.equal(stubAction)
                  })

                })

                describe('When the heartbeat duration passes again', () => {

                  before(() => {
                    dispatch.reset()
                    clock.tick(ms)
                  })

                  it('should not dispatch any more heartbeat actions', () => {
                    expect(dispatch.callCount).to.be.equal(0)
                  })
                })

              })
            })

          })

        })

      })

    })

    describe('Given the heartbeat is created', () => {

      before(() => {
        setupHeartbeat()
        actionHandler = hb({dispatch, getState})(next)
      })

      after(teardownHeartbeat)

      describe('When an action with arbitrary properties is passed through middleware', () => {

        before(() => actionHandler(stubActionWithExtraProps))

        describe('And manually forced to beat via `beat`', () => {

          before(() => hb.beat())

          describe('Then a hearbeat action', () => {

            it('should have been dispatched', () => {
              expect(dispatch.calledOnce).to.be.true
              const dispatchedAction: HeartbeatAction = dispatch.getCall(0).args[0]
              expect(dispatchedAction.type).to.be.equal(HEARTBEAT_ACTION_TYPE)
            })

            it('should have the previously collated actions as payload', () => {
              const dispatchedAction: HeartbeatAction = dispatch.getCall(0).args[0]
              expect(dispatchedAction.payload).to.have.length(1)
              expect(dispatchedAction.payload[0].timestamp).to.be.a('number')
              expect(dispatchedAction.payload[0].action).to.be.equal(stubActionWithExtraProps)
            })

          })

          describe('And the collated pending actions', () => {

            it('should be empty', () => {
              expect(hb.stethescope()).to.be.empty
            })

          })

          describe('When more actions are passed through the middleware', () => {

            before(() => actionHandler(stubAction))

            describe('When the collated actions list is emptied via `flush`', () => {

              before(() => hb.flush())

              describe('Then the collated actions list', () => {

                it('should have been empty', () => {
                  expect(hb.stethescope()).to.be.empty
                })

              })

            })

          })

        })

      })

    })

    describe('Given the heartbeat is started with a predicate', () => {

      interface TestState {
        nic: string
      }

      const stubState: TestState = {
        nic: 'cage'
      }
      const stubActionSatisfiesPredicate: Action = {
        type: 'nic'
      }
      const stubActionFailsPredicate: Action = {
        type: 'cage'
      }

      before(() => {
        dispatch = sinon.stub()
        getState = sinon.stub().returns(stubState)
        hb = createHeartbeat<TestState>(ms, dispatch, (state: TestState, action: any) => {
          return action.type !== state.nic
        }, false)
        actionHandler = hb({dispatch, getState})(next)
      })

      afterEach(() => hb.flush())

      describe('When an action is handled that satisfies the predicate', () => {

        before(() => actionHandler(stubActionSatisfiesPredicate))

        describe('Then the action', () => {

          it('should be collated into the pending actions', () => {
            expect(hb.stethescope()[0].action).to.be.deep.equal(stubActionSatisfiesPredicate)
          })

        })

      })

      describe('When an action is handled that fails the predicate', () => {

        before(() => actionHandler(stubActionFailsPredicate))

        describe('Then the action', () => {

          it('should not be collated into the pending actions', () => {
            expect(hb.stethescope()).to.be.empty
          })

        })

      })

    })

    describe('Given the heartbeat is started with a transform', () => {

      interface TestState {
        nic: string
      }

      const stubState: TestState = {
        nic: 'cage'
      }
      const stubAction: Action = {
        type: 'nic'
      }
      const stubActionTransformed: AnyAction = {
        type: 'nic',
        nic: 'cage'
      }

      const transform: HeartbeatTransform<TestState> = (state: TestState, action: Action) => {
        return {
          ...action,
          ...state
        }
      }

      before(() => {
        dispatch = sinon.stub()
        getState = sinon.stub().returns(stubState)
        hb = createHeartbeat<TestState>(ms, dispatch, undefined, false, undefined, transform)
        actionHandler = hb({dispatch, getState})(next)
      })

      afterEach(() => hb.flush())

      describe('When an action is handled', () => {

        before(() => actionHandler(stubAction))

        describe('Then the action', () => {

          it('should be transformed when collated into the pending actions', () => {
            expect(hb.stethescope()[0].action).to.be.deep.equal(stubActionTransformed)
          })

        })

      })

    })

  })

})
