return {
  {
    "neovim/nvim-lspconfig",
    opts = function()
      local keys = require("lazyvim.plugins.lsp.keymaps").get()

      keys[#keys + 1] = {
        mode = { "n", "v" },
        "<A-enter>",
        vim.lsp.buf.code_action,
        desc = "Code Action",
      }
    end,
  },
}
