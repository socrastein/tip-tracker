// Builds a camelCase modifier class: modifier('btn', 'primary') → 'btnPrimary'.
export const modifier = (block, name) => block + name[0].toUpperCase() + name.slice(1)
