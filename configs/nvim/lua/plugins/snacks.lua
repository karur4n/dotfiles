return {
  "folke/snacks.nvim",
  opts = {
    picker = {
      hidden = true,
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
          follow = true,
        },
        git_log = {
          follow = true,
        },
      },
    },
  },
}
