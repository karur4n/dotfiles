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
          actions = {
            yank_rel_path = function(picker)
              local item = picker:current()
              if not item then
                return
              end
              local rel = vim.fn.fnamemodify(Snacks.picker.util.path(item), ":.")
              vim.fn.setreg("+", rel)
              Snacks.notify.info("Yanked: " .. rel)
            end,
          },
          win = {
            list = {
              keys = {
                ["Y"] = "yank_rel_path",
              },
            },
          },
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
