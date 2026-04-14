return {
  {
    "folke/tokyonight.nvim",
    lazy = false,
    priority = 1000,
    opts = {
      style = "night", -- "night", "storm", "moon", "day"
    },
  },
  {
    "LazyVim/LazyVim",
    opts = {
      colorscheme = "tokyonight",
    },
  },
}
