# Dynamic Bundling

One way to address the gap in serving primitives is a technique we’ll call “dynamic bundling” here.
Traditional asset deployments require that there’s a strict 1-to-1 mapping between output files generated at build time and network requests at runtime.
The output files of the build process are served by a simple file server without any additional transformations beyond compression.

Dynamic bundling adds a runtime component that allows for assembly of network responses from file fragments (“chunks”) generated at build time.
This makes using a simple file server impossible but offers the following advantages:

* Reduced network requests caused by code splitting.
  Very fine-grained splitting strategies can be used without the overhead and latency anomalies that come with tens or hundreds of individual requests.
* Reduced number of output files (and build duration) when generating many variants.
  E.g. each use of a feature flag (or experiment) can be isolated into one chunk.
  The correct code fragment can then be dynamically selected while assembling the bundle.
  For `n` feature flags, we only need `O(n)` files.
    - Build-time assembly, on the other hand, is forced to combine files that use many different feature flags,
      which means generating `O(2^n)` output files for `n` feature flags.
* The content of files can be templated, e.g. to inline minor variants without duplicating big chunks of code in the outputs.

This general idea has been implemented to varying degrees by different companies and organizations over the years:

* **Codex** (Netflix), used by netflix.com and other Netflix consumer experiences.
* **Module Set Serving** (“MSS”, Google), used by Google Search, GMail and other Google properties.
* `ResourceLoader` (Wikimedia, [source][ResourceLoader-blog]), used to bundle code on wikipedia.com.
* YUI (Yahoo) defines an optional [ComboHandler to fetch YUI-style modules][YUI-ComboHandler] (HT [@lawnsea][lawnsea]).
* Progressive Bundling: Used by [begin.com](https://slides.begin.com/).
* Honorable mentions for some generic JavaScript CDNs:
  * [`packd-es`][packd-es] (\<div>riots, [source][packd-es-source]),
    used by webcomponents.dev and is the only entry on this list that combines ES modules.
    Originally forked from [`packd`][packd] but diverged a lot.
  * **Jsdelivr** allows to dynamically request combinations of npm packages.
    Similar to `packd-es` but generates scripts instead of modules.

MSS and Codex are two very similar implementations, at least in spirit.
Most others (YUI, `ResourceLoader`) focus more on pure concatenation without explicit handling of conditional or dynamic code.

[packd-es]: https://github.com/webcomponents-dev/packd-es
[packd-es-source]: https://twitter.com/Gluckies/status/1171059699229368320
[packd]: https://github.com/Rich-Harris/packd
[ResourceLoader-blog]: https://phabricator.wikimedia.org/phame/live/7/post/175/wikipedia_s_javascript_initialisation_on_a_budget/
[YUI-ComboHandler]: https://yuilibrary.com/yui/docs/yui/create.html#using-a-combohandler
[lawnsea]: https://twitter.com/lawnsea

## Use Cases

### Chunk Batching

*Applies to: `Codex`, `MSS`.*

This use case could also be called "fine-grained chunk splitting" since these
two goals are tightly related. Compression and other protocol-level concerns
are fundamentally at odds with a desire to ship very small units of code
("chunks" of code). The central question here is: Can we mitigate this effect
and still retain the same level of chunk splitting?

1. Send only the code that is requested.
   Counter-Example: The traditional webpack commons chunks contains all
                    3rd-party code even if only one library is used on the
                    current page.
2. Send code only once.
   Counter-Example: Without chunk splitting, a module used in more than one
                    entrypoint will be downloaded and executed multiple times.
3. Any number of chunks can be downloaded using a single request.
   Counter-Example: A script tag with a static file server will only download
                    exactly one chunk per request.

#### Chunk Batching API

Both Codex and MSS are implementing chunk batching by combining a web service
to serve concatenated chunks with a client-side runtime to manage chunk loads.
These two chunk batching solutions independently added similar features for
the API:

* Specify a set of requested chunks.
* Include all dependencies of the requested chunks as an option.
* Exclude a set of already loaded chunks.
* Pass a compressed representation of feature flags to customize the response.
* A combined version for the overall chunk set and no versioning of individual
  chunks.

Some of these choices (e.g. excludes, combined version) are based on the
observation that giving the client full knowledge of the chunk graph gets less
practical as the size of the graph expands. It is further complicated by
customized assets where chunk dependencies may vary between different
variants/users. See: The client cache manifest problem.

### Customized Assets

*Applies to: `Codex`, `MSS`.*

In the presence of user preferences, themes, feature flags, and experiments,
it can be impractical to render every possible combination of minor variations
in the assets ahead of time:
With 10 independent feature flags, a megabyte of assets sent to each user
requires generating a gigabyte of assets when each possible combination is
generated at build time.
And it gets worse from there.

The easy solution is to include all variations regardless of how applicable they
are to the current user.
Runtime conditionals are then used to activate the parts of the returned code
that is actually needed.
This is wasteful in regards to network transfer and parse/execute times
and it also risks exposing experimental features.

A better solution only includes code that applies to the current user.

1. Parts of a chunk can be conditionally included based on the session.
2. These conditional inclusions may affect the dependency graph by adding
   conditional edges.

**Note:** Technically (1) can be expressed in terms of (2). But it assumes that
          the conditional chunks are somehow hidden from direct requests.

### Simplified Deployment Pipeline

*Applies to: `begin.com`, `ResourceLoader`.*

This use case is very different from the others and it's no coincident that it
led to very different solutions. The underlying idea is still the same: Instead
of generating the final response body ahead of time and deploying static files,
the final assets are generated dynamically after the deploy.

The basic requirement is: Source files can be pushed to production without any
additional steps and can be requested almost immediately. Any transformation
like concat/rollup of files or minification needs to be fast enough to happen
during request handling. Generally the result can still be served from a CDN
but on a cache miss, e.g. immediately following a deploy, bundling happens live.

In this use case, dynamic bundling is used to reduce the lead time, specifically
the time it takes to release changes.

## (No) Client Cache Manifest

There's an inheritent tension between the desire to batch resources and cache
stability. On one hand combining resources is good since it reduces roundtrips
and allows efficient compression. Even in the era of http2, there is a cost to
making more requests. But batched resources are less cachable. There's no easy
way to isolate cache invalidation to just a small unit when it's always included
in a combined response.

The same kind of problem can be seen with different technologies:

1. http2 push: How to only push resources that the client needs?
2. Dynamic Bundling: How to only send chunks the client hasn't cached yet?
3. Web Bundles: How to prune already cached resources from a bundle?
4. ReactNative: How to only send deltas instead of full application builds when
                doing over-the-air updates?

In all cases, the communication channel for requesting the bundle doesn't
generally have sufficient bandwidth to transfer a complete description of the
client cache state - if it's even possible to capture it.

So far a few strategies have been observed to deal with this problem:

1. Bundle Version Diff: The client attaches the last version it is aware of.
   It receives a diff containing the latest contents. This assumes that the
   client caches the entire chunk set (at least as it applies to the user).
   Usual solution for over-the-air updates in ReactNative (e.g. AppCenter).
2. Push all: This is the approach used by http2, dynamic bundling, and web
   bundles. All resources are pushed to the client even if the client already
   knows about them, e.g. because it downloaded a previous version of the
   bundle. The client may ignore the contents, in the case of http2 even cancel
   the transfer, but the server will attempt to send all resources at first.

For completeness sake, there's also a strategy for http2 push that uses a cookie
to track previously pushed resources. This can work but has a couple of
downsides when looking at it as a complete solution to the overall cache state
problem:

1. The cookie may be out of sync with the actual cache state, leading to
   resources that are missing from the cache not being pushed. This solution
   always requires a second layer to catch missed pushes.
2. When tracking individual resources (instead of all-or-nothing) in the cookie,
   it doesn't scale properly. It requires storing each resource id and version
   in a cookie which can quickly grow to kilobytes.
