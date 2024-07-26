-- set number of lines either side of cursor
-- 999 keeps cursor centered
vim.opt.scrolloff = 20

-- enable mouse support
vim.opt.mouse = "a"

-- show line numbers relative to current line
vim.opt.number = true
vim.opt.relativenumber = true

-- show column to the right of line numbers for symbols eg. git
vim.opt.signcolumn = "yes"

-- guess indentation when i hit enter
vim.opt.smartindent = true

-- make pressing tab insert 2 spaces
vim.opt.expandtab = true
vim.opt.tabstop = 2
-- insert/remove 2 spaces when using >> or <<
vim.opt.shiftwidth = 2

--  highlight focussed line
vim.opt.cursorline = true

-- maintains undo history in a separate file
vim.opt.undofile = true

-- file encoding
vim.opt.fileencoding = "utf-8"

-- ignore case when searching unless search term contains uppercase chars
vim.opt.ignorecase = true
vim.opt.smartcase = true

-- hide tab bar at the top (set to 2 to show)
vim.opt.showtabline = 0

-- don't create a swap file for open files
vim.opt.swapfile = false

-- enable full range of colors provided by terminal emulator
vim.opt.termguicolors = true

-- hide netrw header
vim.g.netrw_banner = 0

-- search
vim.opt.hlsearch = false
vim.opt.incsearch = true


vim.api.nvim_create_autocmd('TextYankPost', {
  desc = 'Highlight when yanking (copying) text',
  group = vim.api.nvim_create_augroup('kickstart-highlight-yank', { clear = true }),
  callback = function()
    vim.highlight.on_yank()
  end,
})
