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
