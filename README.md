                                                 ____    ____  
                              ____    ____      /    \  /    \      ____    ____
                             /    \  /    \    |      \/      |    /    \  /    \
                            |      \/      |   |              |   |      \/      |
                             \            /     \            /     \            /
                               \        /         \        /         \        /
                                 \    /             \    /             \    /  
                                   \/                 \/                 \/

[![Build Status](https://tra|vis-ci.org/alechill/redux-heartbeat.svg?branch=master)](https://travis-ci.org/alechill/redux-heartbeat)

A middleware for Redux providing a heartbeat that contains batched log of actions occurring between each beat.

Created for incrementally collecting usage data for driving analytics, contextual error reporting, even persisting replayable user sessions.

Redux-heartbeat makes no assumptions as to what you will be doing with the heartbeat's contents. It is itself dispatched as an ordinary redux action so you can handle it however you like... log it, send to server, store to disk, send to your 3rd party metrics service, mirror a user's session for support, whatever!
