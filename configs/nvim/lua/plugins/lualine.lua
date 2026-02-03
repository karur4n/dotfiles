-- LazyVimのデフォルトでは lualine_z に時計が表示されるため、
-- これを空にして時計表示を無効化する
return {
  "nvim-lualine/lualine.nvim",
  opts = {
    sections = {
      -- 時計表示を消す
      lualine_z = {},
    },
  },
}
