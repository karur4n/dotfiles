return {
  "folke/snacks.nvim",
  opts = {
    picker = {
      hidden = true,
      exclude = {
        ".git",
        ".wt",
        "dist",
        "node_modules",
      },
      sources = {
        explorer = {
          hidden = true,
          ignored = true,
        },
        grep = {
          hidden = true,
          follow = true,
        },
        files = {
          hidden = true,
          ignored = true,
          follow = true,
        },
        git_log = {
          follow = true,
        },
      },
    },
  },
}
