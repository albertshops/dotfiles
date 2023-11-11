local opts = { noremap = true, silent = false }
local keymap = vim.api.nvim_set_keymap

-- remap space as leader key
keymap("", "<Space>", "<Nop>", opts)
vim.g.mapleader = " "
vim.g.maplocalleader = " "

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
keymap("n", "<leader>f", ":Telescope find_files<CR>", opts)
keymap("n", "<leader>g", ":Telescope live_grep<CR>", opts)

-- lsp hover
keymap('n', 'K', ":lua vim.lsp.buf.hover()<CR>", opts)

-- diagnostics
keymap('n', '<leader>d', ":lua vim.diagnostic.open_float()<CR>", opts)

-- go to buffer
keymap('n', 'gb', ":ls<CR>:b<Space>", opts)

-- quickfix
keymap('n', '<leader>n', ":cnext<CR>", opts)
keymap('n', '<leader>p', ":cprev<CR>", opts)

-- append "set" to start of word and capitalize first letter
keymap('n', "<leader>s", "iset<Esc>l~", opts)
