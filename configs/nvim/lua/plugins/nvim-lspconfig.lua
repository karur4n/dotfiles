return {
  {
    "neovim/nvim-lspconfig",
    opts = {
      servers = {
        ["*"] = {
          keys = {
            { "<A-enter>", vim.lsp.buf.code_action, mode = { "n", "v" }, desc = "Code Action" },
          },
        },
      },
    },
  },
}
