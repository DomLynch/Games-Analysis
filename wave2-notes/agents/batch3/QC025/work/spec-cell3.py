N = 'BifrostTitan-DAoC-Client-Lib'
H = '/mnt/frankendom-donors/BifrostTitan-DAoC-Client-Lib/include/daoc_client_lib/terrain_height_map.h'
C = '/mnt/frankendom-donors/BifrostTitan-DAoC-Client-Lib/src/terrain_height_map.cpp'
RM = '/mnt/frankendom-donors/BifrostTitan-DAoC-Client-Lib/README.md'
LIC = '/mnt/frankendom-donors/BifrostTitan-DAoC-Client-Lib/LICENSE'
SPEC = [
 (N, 'height query signature (ground height at game x,y)', H, 'float height_at(float game_x, float game_y) const;'),
 (N, 'unit_factor is 255/65536 (sample per about 257 game units)', H, 'static constexpr float unit_factor = terrain_factor / 65536.0f;'),
 (N, 'height_at converts game units to sample units', C, 'const float x = game_x * unit_factor;'),
 (N, 'triangle choice by comparing fractional parts', C, 'if (x - cell_x < y - cell_y)'),
 (N, 'interpolation within one triangle', C, 'return interpolate_triangle(top_right, b, c, x, y) / unit_factor;'),
 (N, 'out of map area throws, no clamp', C, 'throw std::out_of_range("Terrain coordinates are outside the interpolable map area");'),
 (N, 'README: terrain height sampling is ported; no camera listed', RM, 'terrain height sampling, NIF placement metadata'),
 (N, 'licence: MIT', LIC, 'Copyright (c) 2026 Nathan Martell'),
]
