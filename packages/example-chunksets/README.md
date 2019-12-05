# Example Chunksets

This directory contains examples of chunksets and expected output files when
assembling assets for these sets.

## Data Format

Each subdirectory represents one chunkset and is split into two parts:
`assets` and `chunks`.

### `assets`

Output files that can be generated for this chunkset.
The first line of the file contains a comment with the JSON-encoded options
used to generate this asset.
The remaining lines are the contents of the actual asset.
The filenames are human-readable descriptions.

### `chunks`

The various chunks of this chunkset.
Each file represents one chunk, the filename starts with the numeric chunk id,
followed by a dash, and ending in the chunk name.

In the future, there may be separators to express a chunk that contains more
than one part.
