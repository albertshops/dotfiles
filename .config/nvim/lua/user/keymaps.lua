local opts = { noremap = true, silent = false }
local keymap = vim.api.nvim_set_keymap

-- remap space as leader key
keymap("", "<Space>", "<Nop>", opts)
vim.g.mapleader = " "
vim.g.maplocalleader = " "

-- ctrl-c -> esc
keymap("i", "<C-c>", "<Esc>", opts)

-- open file explorer
keymap("n", "<leader>e", ":Ex<CR>", opts)

-- focus last editted buffer
keymap("n", "<Tab>", ":buffer#<CR>", opts)


-- stay in indent mode when in visual mode
keymap("v", "<", "<gv", opts)
keymap("v", ">", ">gv", opts)

-- move text up and down
keymap("v", "<C-j>", ":move '>+1<CR>gv=gv", opts)
keymap("v", "<C-k>", ":move '<-2<CR>gv=gv", opts)

-- yank to clipboard
keymap("n", "<leader>y", "\"+y", opts)
keymap("n", "<leader>Y", "\"+Y", opts)
keymap("v", "<leader>y", "\"+y", opts)

-- paste from yank register
keymap("n", "<leader>p", "\"0p", opts)
keymap("n", "<leader>P", "\"0P", opts)

-- telescope
keymap("n", "<leader>to", ":Telescope<CR>", opts)
keymap("n", "<leader>tm", ":Telescope marks<CR>", opts)
keymap("n", "<leader>tb", ":Telescope buffers<CR>", opts)
keymap("n", "<leader>tr", ":Telescope registers<CR>", opts)
keymap("n", "<leader>tf", ":Telescope find_files<CR>", opts)
keymap("n", "<leader>ts", ":Telescope live_grep<CR>", opts)
keymap("n", "<leader>td", ":Telescope diagnostics<CR>", opts)

-- diagnostics
keymap('n', '<leader>d', ":lua vim.diagnostic.open_float()<CR>", opts)

-- go to buffer
keymap('n', 'gb', ":ls<CR>:b<Space>", opts)

-- quickfix
function QuickfixNext()
  local status, _ = pcall(vim.cmd, 'cnext')
  if not status then
    pcall(vim.cmd, 'cfirst')
  end
end

function QuickfixPrev()
  local status, _ = pcall(vim.cmd, 'cprev')
  if not status then
    pcall(vim.cmd, 'clast')
  end
end

function QuickfixToggle()
  local windows = vim.fn.getwininfo()
  local quickfix_open = false
  for _, win in pairs(windows) do
    if win.quickfix == 1 then
      quickfix_open = true
      break
    end
  end

  if quickfix_open then
    vim.cmd('cclose')
  else
    vim.cmd('copen')
  end
end

keymap('n', '<leader>co', ":lua QuickfixToggle()<CR>", opts)
keymap('n', '<leader>cn', ":lua QuickfixNext()<CR>", opts)
keymap('n', '<leader>cp', ":lua QuickfixPrev()<CR>", opts)

-- LSP

-- hover
keymap('n', 'K', ":lua vim.lsp.buf.hover()<CR>", opts)
-- go to definition / implementation
keymap('n', 'gd', ":lua vim.lsp.buf.definition()<CR>", opts)
keymap('n', 'gi', ":lua vim.lsp.buf.implementation()<CR>", opts)
-- code actions
keymap('n', '<leader>a', ":lua vim.lsp.buf.code_action()<CR>", opts)

-- view current file path
keymap('n', '<leader>w', ":echo expand('%:p')<CR>", opts)
