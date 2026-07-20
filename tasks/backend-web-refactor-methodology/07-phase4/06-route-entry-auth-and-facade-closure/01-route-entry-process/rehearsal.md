# 4-5.1 Rehearsal

App bootstrap registers the guard once before the router starts initial navigation. The guard completes or aborts a
navigation before a route component can mount. A second page cannot create a second observer because no page imports
the process.
