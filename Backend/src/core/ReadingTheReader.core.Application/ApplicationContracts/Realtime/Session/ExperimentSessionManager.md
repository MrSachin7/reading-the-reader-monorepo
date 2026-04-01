# ExperimentSessionManager concurrency notes

`ExperimentSessionManager` mixes a few concurrency primitives because it has two different kinds of work:

1. Slow lifecycle operations that must not overlap.
2. Fast data-path operations that should stay lock-free.

## What `_lifecycleGate` is doing

`_lifecycleGate` is a `SemaphoreSlim(1, 1)`, effectively an async mutex.

It protects state transitions such as:

- setting the current participant
- setting the current eye tracker
- starting a session
- stopping a session
- subscribing and unsubscribing gaze clients

Those operations are asynchronous and may `await`, so a normal `lock` cannot be used. The semaphore ensures that only one lifecycle mutation runs at a time, which avoids races like:

- one request starting a session while another stops it
- one client subscribing while another unsubscribes and both try to start/stop hardware tracking
- saving a snapshot based on partially updated session state

## Why `Volatile.Read` / `Volatile.Write` are used

Fields like `_session` and `_latestGazeSample` are read from different threads without always taking `_lifecycleGate`.

`Volatile.Read` and `Volatile.Write` give these lock-free reads/writes memory-ordering guarantees:

- a reader sees the latest published value, not a stale cached one
- writes before a `Volatile.Write` become visible before the new reference is observed

That matters because `GetCurrentSnapshot()` and gaze-event code can run concurrently with lifecycle code.

In practice:

- lifecycle methods publish a new immutable-ish session object with `Volatile.Write`
- readers fetch the current reference with `Volatile.Read`
- `_latestGazeSample` is also published/read this way

Without this, the code might still "usually work", but it would rely on weaker, less explicit cross-thread visibility rules.

## Why `Interlocked` is also here

`Interlocked` is used for single-value atomic transitions:

- `_receivedGazeSamples` uses `Increment` and `Read`
- `_isSubscribedToHardware` uses `Exchange`
- `_isHardwareTracking` uses `Exchange`

These fields are not just "published"; they are changed conditionally in a way that must be atomic.

Example:

- `Interlocked.Exchange(ref _isHardwareTracking, 1) == 0`

means "set this to 1, and only the thread that observed the old value `0` should perform the start logic."

That prevents duplicate:

- event subscriptions
- `StartEyeTracking()` calls
- `StopEyeTracking()` calls

## Why not use only `_lifecycleGate`?

Because not all code paths should wait on the lifecycle semaphore.

`OnGazeDataReceived()` is on the hot path. It should do very little:

- update counters
- store the latest sample
- fan out to subscribers

If gaze ingestion had to acquire the same gate as session start/stop or subscribe/unsubscribe, the event path would be more coupled to slower operations and more likely to stall.

The current split is roughly:

- `_lifecycleGate` for coarse-grained async orchestration
- `Volatile` for publishing shared references safely
- `Interlocked` for tiny atomic state changes and counters

## Why objects are cloned

`Participant`, `EyeTrackerDevice`, and `GazeData` are mutable classes.

The manager clones them before storing or returning them so outside code cannot mutate internal state after it has been published. That is especially important when a reference is shared across threads.

## Mental model

A useful way to read this class is:

- `_lifecycleGate` serializes "control plane" changes
- gaze callbacks are the "data plane"
- `Volatile` and `Interlocked` are the bridge that lets the data plane read/update shared state safely without taking the full lifecycle lock

So the class looks more complicated than a normal service, but each primitive has a narrow job.
