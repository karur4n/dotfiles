-- Keymaps are automatically loaded on the VeryLazy event
-- Default keymaps that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/keymaps.lua Add any additional keymaps here

local map = LazyVim.safe_keymap_set

-- yp => yank relative file path, yP => yank absolute file path
-- https://github.com/LazyVim/LazyVim/discussions/6337
vim.keymap.set("o", "p", function()
  local name = vim.api.nvim_buf_get_name(0)
  if name == "" then
    vim.notify("No file name for this buffer", vim.log.levels.WARN)
    return "<Esc>"
  end
  local path = vim.fn.expand("%:.")
  vim.fn.setreg("+", path)
  vim.fn.setreg('"', path)
  vim.notify("Yanked: " .. path)
  return "<Esc>"
end, { expr = true, desc = "Yank relative file path" })

vim.keymap.set("o", "P", function()
  local name = vim.api.nvim_buf_get_name(0)
  if name == "" then
    vim.notify("No file name for this buffer", vim.log.levels.WARN)
    return "<Esc>"
  end
  local path = vim.fn.expand("%:p")
  vim.fn.setreg("+", path)
  vim.fn.setreg('"', path)
  vim.notify("Yanked: " .. path)
  return "<Esc>"
end, { expr = true, desc = "Yank absolute file path" })
