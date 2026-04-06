return {
  {
    "nvim-neotest/neotest",
    dependencies = {
      "nvim-neotest/nvim-nio",
      "nvim-lua/plenary.nvim",
      "antoinemadec/FixCursorHold.nvim",
      "nvim-treesitter/nvim-treesitter",
      "arthur944/neotest-bun",
    },
    config = function()
      require("neotest").setup({
        adapters = {
          require("neotest-bun"),
        },
      })
    end,
  },
}
