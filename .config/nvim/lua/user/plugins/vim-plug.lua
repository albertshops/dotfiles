local Plug = vim.fn['plug#']

vim.call('plug#begin', '~/.config/nvim/lua/plugged')

-- utils
Plug('nvim-lua/plenary.nvim')

-- auto complete
Plug('hrsh7th/nvim-cmp')
Plug('hrsh7th/cmp-buffer')
Plug('hrsh7th/cmp-path')
Plug('hrsh7th/cmp-cmdline')
Plug('saadparwaiz1/cmp_luasnip')
Plug('hrsh7th/cmp-nvim-lsp')

-- snippets
Plug('L3MON4D3/LuaSnip')

-- lsp
Plug('williamboman/mason.nvim')
Plug('williamboman/mason-lspconfig.nvim')
Plug('neovim/nvim-lspconfig')
Plug('b0o/SchemaStore.nvim')
Plug('jose-elias-alvarez/null-ls.nvim')

-- colorschemes
Plug('folke/tokyonight.nvim')

-- fuzzy finding
Plug('nvim-telescope/telescope.nvim')

-- file navigation
Plug('ThePrimeagen/harpoon')

-- status line
Plug('nvim-lualine/lualine.nvim')

-- syntax highlighting
Plug('nvim-treesitter/nvim-treesitter')

-- git
Plug('lewis6991/gitsigns.nvim')

-- surround
Plug('kylechui/nvim-surround')


vim.call('plug#end')
