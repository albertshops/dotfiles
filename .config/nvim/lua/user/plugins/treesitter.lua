local ts = require('nvim-treesitter.configs')

ts.setup({
  modules = {},
  ensure_installed = {},
  sync_install = false,
  auto_install = true,
  ignore_install = {},
  highlight = {
    enable = true,
    disable = function(_, buf)
      local max_filesize = 100 * 1024 -- 100 KB
      local ok, stats = pcall(vim.loop.fs_stat, vim.api.nvim_buf_get_name(buf))
      if ok and stats and stats.size > max_filesize then
        return true
      end
    end,
    additional_vim_regex_highlighting = false,
  },
})


local ts_utils = require 'nvim-treesitter.ts_utils'

function HighlightBlock()
  local node = ts_utils.get_node_at_cursor()
  if node then
    local start_row, _, end_row, _ = node:range()
    vim.api.nvim_win_set_cursor(0, { start_row + 1, 0 })
    vim.cmd("normal! V")
    vim.api.nvim_win_set_cursor(0, { end_row + 1, 0 })
  end
end

function HighlightFunction()
  local node = ts_utils.get_node_at_cursor()

  while true do
    if node == nil then
      return
    end

    if string.find(node:type(), "function") then
      break
    end

    node = node:parent()
  end

  if node then
    local start_row, _, end_row, _ = node:range()
    vim.api.nvim_win_set_cursor(0, { start_row + 1, 0 })
    vim.cmd("normal! V")
    vim.api.nvim_win_set_cursor(0, { end_row + 1, 0 })
  end
end

-- Optionally, map this function to a key
vim.api.nvim_set_keymap('n', '<leader>hb', ':lua HighlightBlock()<CR>', { noremap = true, silent = false })
vim.api.nvim_set_keymap('n', '<leader>hf', ':lua HighlightFunction()<CR>', { noremap = true, silent = false })
