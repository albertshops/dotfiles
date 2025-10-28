-- [[ Options ]]
vim.g.mapleader = " "
vim.g.maplocalleader = " "

vim.g.have_nerd_font = true

vim.g.loaded_python_provider = 0
vim.g.loaded_python3_provider = 0

vim.g.netrw_banner = 0

-- set borders
vim.opt.winborder = "rounded"

-- set number of lines either side of cursor
-- 999 keeps cursor centered
vim.opt.scrolloff = 999

-- enable mouse support
vim.opt.mouse = ""

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

-- search
vim.opt.hlsearch = false
vim.opt.incsearch = true

-- Highlight when yanking (copying) text
vim.api.nvim_create_autocmd("TextYankPost", {
	desc = "Highlight when yanking (copying) text",
	group = vim.api.nvim_create_augroup("kickstart-highlight-yank", { clear = true }),
	callback = function()
		vim.hl.on_yank()
	end,
})

-- [[ Install `lazy.nvim` plugin manager ]]
local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not (vim.uv or vim.loop).fs_stat(lazypath) then
	local lazyrepo = "https://github.com/folke/lazy.nvim.git"
	local out = vim.fn.system({ "git", "clone", "--filter=blob:none", "--branch=stable", lazyrepo, lazypath })
	if vim.v.shell_error ~= 0 then
		error("Error cloning lazy.nvim:\n" .. out)
	end
end
vim.opt.rtp:prepend(lazypath)

-- [[ Configure and install plugins ]]
require("lazy").setup({
	{
		"saghen/blink.cmp",
		dependencies = { "rafamadriz/friendly-snippets" },
		version = "1.*",
		opts = {
			keymap = {
				preset = "none",
				["<Tab>"] = { "select_next", "fallback" },
				["<S-Tab>"] = { "select_prev" },
				["<CR>"] = { "accept", "fallback" },
			},
			appearance = {
				nerd_font_variant = "mono",
			},
			completion = { preselect = true, documentation = { auto_show = true } },
			sources = {
				default = { "lsp", "path", "snippets", "buffer" },
			},
			fuzzy = { implementation = "prefer_rust_with_warning" },
		},
		opts_extend = { "sources.default" },
	},

	{
		"supermaven-inc/supermaven-nvim",
		config = function()
			require("supermaven-nvim").setup({
				keymaps = {
					accept_suggestion = "<C-s>",
					accept_word = "<C-w>",
				},
			})
		end,
	},

	{ "numToStr/Comment.nvim" },

	{
		"stevearc/conform.nvim",
		opts = {
			formatters_by_ft = {
				lua = { "stylua" },
				rust = { "rustfmt" },
				javascript = { "prettierd" },
				typescript = { "prettierd" },
				javascriptreact = { "prettierd" },
				typescriptreact = { "prettierd" },
				css = { "prettierd" },
				json = { "prettierd" },
				markdown = { "prettierd" },
			},
			format_on_save = {
				lsp_fallback = true,
				async = false,
				timeout_ms = 1000,
			},
		},
	},

	{ "kdheepak/lazygit.nvim" },

	{
		"nvim-lualine/lualine.nvim",
		dependencies = { "nvim-tree/nvim-web-devicons" },
		opts = {
			sections = {
				lualine_a = { "mode" },
				lualine_b = {
					"branch",
					"diff",
					{
						"diagnostics",
						sources = { "nvim_diagnostic" },
						symbols = { error = "", warn = "", info = "", hint = "" },
					},
				},
				lualine_c = { { "filename", path = 2 } },

				lualine_x = { "filetype" },
				lualine_y = { "progress" },
				lualine_z = { "location" },
			},
		},
	},

	{ "rcarriga/nvim-notify" },

	{
		"stevearc/oil.nvim",
		opts = {
			use_default_keymaps = false,
			keymaps = {
				["<CR>"] = "actions.select",
				["-"] = { "actions.parent", mode = "n" },
			},
			view_options = {
				show_hidden = true,
			},
			columns = {},
		},
	},

	{ "b0o/schemastore.nvim" },

	{
		"declancm/cinnamon.nvim",
		version = "*", -- use latest release
		opts = {
			-- Disable all provided keymaps
			keymaps = {
				basic = false,
				extra = false,
			},
			-- Only scroll the window
			options = {
				mode = "window",
				delay = 3,
			},
		},
	},

	{
		"kylechui/nvim-surround",
		event = "VeryLazy",
		opts = {},
	},

	{
		"nvim-telescope/telescope.nvim",
		tag = "0.1.8",
		dependencies = { "nvim-lua/plenary.nvim", "nvim-telescope/telescope-file-browser.nvim" },
		config = function()
			local actions = require("telescope.actions")
			local action_state = require("telescope.actions.state")
			local builtin = require("telescope.builtin")
			local config = require("telescope.config").values

			local toggle_search_pickers = function(prompt_bufnr)
				local current_picker = action_state.get_current_picker(prompt_bufnr)
				local query = current_picker:_get_prompt()
				local picker_name = current_picker.prompt_title or ""

				actions.close(prompt_bufnr)

				if picker_name:match("Find Files") then
					builtin.live_grep({ default_text = query })
				else
					builtin.find_files({ default_text = query })
				end
			end

			require("telescope").setup({
				defaults = {
					vimgrep_arguments = table.insert(config.vimgrep_arguments, "--fixed-strings"),

					layout_strategy = "vertical", -- flex
					layout_config = {
						mirror = true,
						prompt_position = "top",
					},
					sorting_strategy = "ascending",

					prompt_prefix = " ",
					selection_caret = " ",
					path_display = { "smart" },

					mappings = {
						i = {
							["<C-s>"] = toggle_search_pickers,
							["<CR>"] = actions.select_default,
							["<Esc>"] = "close",
							["<C-q>"] = function(buf_nr)
								actions.smart_send_to_qflist(buf_nr)
								builtin.quickfix()
							end,
						},
					},
				},
				pickers = {
					find_files = {},
					buffers = {
						sort_lastused = true,
						ignore_current_buffer = true,
						filter = function(buf)
							local filetype = vim.api.nvim_buf_get_option(buf.bufnr, "filetype")
							return filetype ~= "netrw"
						end,
					},
				},
			})
		end,
	},

	{
		"christoomey/vim-tmux-navigator",
		cmd = {
			"TmuxNavigateLeft",
			"TmuxNavigateDown",
			"TmuxNavigateUp",
			"TmuxNavigateRight",
			"TmuxNavigatorProcessList",
		},
		keys = {
			{ "<c-h>", "<cmd><C-U>TmuxNavigateLeft<cr>" },
			{ "<c-j>", "<cmd><C-U>TmuxNavigateDown<cr>" },
			{ "<c-k>", "<cmd><C-U>TmuxNavigateUp<cr>" },
			{ "<c-l>", "<cmd><C-U>TmuxNavigateRight<cr>" },
		},
	},

	{
		"folke/tokyonight.nvim",
		opts = { transparent = true },
	},

	{
		"nvim-treesitter/nvim-treesitter",
		opts = { auto_install = true },
	},

	{ "folke/trouble.nvim" },

	{
		"tadaa/vimade",
		opts = {
			recipe = { "default", { animate = false } },
			ncmode = "windows",
			fadelevel = 0.6, -- any value between 0 and 1. 0 is hidden and 1 is opaque.
			basebg = { 29, 31, 33 },
			tint = {},
			blocklist = {
				default = {
					highlights = {
						laststatus_3 = function()
							if vim.go.laststatus == 3 then
								return "StatusLine"
							end
						end,
						-- Prevent ActiveTabs from highlighting.
						"TabLineSel",
						"Pmenu",
						"PmenuSel",
						"PmenuKind",
						"PmenuKindSel",
						"PmenuExtra",
						"PmenuExtraSel",
						"PmenuSbar",
						"PmenuThumb",
					},
					buf_opts = { buftype = { "prompt" } },
				},
				default_block_floats = function(win, active)
					return win.win_config.relative ~= ""
							and (win ~= active or win.buf_opts.buftype == "terminal")
							and true
						or false
				end,
			},
			link = {},
			groupdiff = true, -- links diffs so that they style together
			groupscrollbind = false, -- link scrollbound windows so that they style together.
			enablefocusfading = true,
			checkinterval = 1000,
			usecursorhold = false,
			nohlcheck = true,
			focus = {
				providers = {
					filetypes = {
						default = {
							{
								"treesitter",
								{
									min_node_size = 2,
									min_size = 1,
									max_size = 0,
									-- exclude types either too large and/or mundane
									exclude = {
										"script_file",
										"stream",
										"document",
										"source_file",
										"translation_unit",
										"chunk",
										"module",
										"stylesheet",
										"statement_block",
										"block",
										"pair",
										"program",
										"switch_case",
										"catch_clause",
										"finally_clause",
										"property_signature",
										"dictionary",
										"assignment",
										"expression_statement",
										"compound_statement",
									},
								},
							},
							{
								"blanks",
								{
									min_size = 1,
									max_size = "35%",
								},
							},
							{ "static", {
								size = "35%",
							} },
						},
					},
				},
			},
		},
	},

	{
		"akinsho/git-conflict.nvim",
		version = "*",
		config = true,
	},

	{
		"akinsho/toggleterm.nvim",
		version = "*",
		opts = {
			open_mapping = [[<C-t>]],
			direction = "float",
			float_opts = {
				border = "curved",
			},
		},
	},
})

vim.cmd([[colorscheme tokyonight]])

-- [[ LSP ]]
vim.lsp.config["lua"] = {
	cmd = { "lua-language-server" },
	filetypes = { "lua" },
	settings = { Lua = { diagnostics = { globals = { "vim" } } } },
}
vim.lsp.enable("lua")

vim.lsp.config["ts"] = {
	cmd = { "vtsls", "--stdio" },
	filetypes = {
		"typescript",
		"typescriptreact",
		"typescript.tsx",
		"javascript",
		"javascriptreact",
		"javascript.jsx",
	},
	root_markers = { "package.json" },
}
vim.lsp.enable("ts")

-- [[ Keymaps ]]
local map = vim.keymap.set

-- reload init.lua
vim.keymap.set("n", "<leader>i", function()
	dofile(vim.env.MYVIMRC)
	print("Reloaded init.lua")
end)

-- oil
map("n", "<leader>o", ":Oil<CR>", { desc = "Oil" })

-- toggle comments
map("n", "<leader>c", ":lua require('Comment.api').toggle.linewise.current()<CR>", { desc = "Toggle comment" })
map("v", "<leader>c", function()
	local api = require("Comment.api")
	local esc = vim.api.nvim_replace_termcodes("<ESC>", true, false, true)
	vim.api.nvim_feedkeys(esc, "nx", false)
	api.toggle.linewise(vim.fn.visualmode())
end, { desc = "Toggle comment" })

-- clipboard
map("n", "<leader>y", '"+y', { desc = "Yank to clipboard" })
map("v", "<leader>y", '"+y', { desc = "Yank to clipboard" })

-- telescope
map("n", "<Tab>t", ":Telescope<CR>", { desc = "Telescope" })
map("n", "<Tab>o", ":Telescope oldfiles<CR>", { desc = "Telescope oldfiles" })
map("n", "<Tab>b", ":Telescope buffers<CR>", { desc = "Telescope buffers" })
map("n", "<Tab>/", ":Telescope current_buffer_fuzzy_find<CR>", { desc = "Telescope find" })
map("n", "<Tab>f", ":Telescope find_files<CR>", { desc = "Telescope search files" })
map("n", "<Tab>s", ":Telescope live_grep<CR>", { desc = "Telescope search string" })
map("n", "<Tab>m", ":Telescope marks<CR>", { desc = "Telescope marks" })
map("n", "<Tab>r", ":Telescope registers<CR>", { desc = "Telescope registers" })
map("n", "<Tab>c", ":Telescope quickfix<CR>", { desc = "Telescope quickfix" })
map("n", "<Tab><space>", ":Telescope resume<CR>", { desc = "Telescope resume" })
map("n", "<Tab>w", ":Telescope diagnostics<CR>", { desc = "Telescope warnings" })
map("n", "<Tab>d", function()
	local builtin = require("telescope.builtin")
	builtin.diagnostics({
		severity = vim.diagnostic.severity.ERROR,
	})
end, { desc = "Telescope diagnostics" })

-- git
map("n", "<leader>g", ":LazyGit<CR>", { desc = "LazyGit" })
map("n", "<BS>j", ":GitConflictNextConflict", { desc = "Git next conflict" })
map("n", "<BS>k", ":GitConflictPrevConflict", { desc = "Git previous conflict" })
map("n", "<BS>o", ":GitConflictChooseOurs", { desc = "Git choose ours" })
map("n", "<BS>i", ":GitConflictChooseTheirs", { desc = "Git choose incoming" })

-- indent
map("v", "<", "<gv", { desc = "Indent" })
map("v", ">", ">gv", { desc = "Indent" })

-- move selection
map("v", "J", ":move '>+1<CR>gv=gv", { desc = "Move down" })
map("v", "K", ":move '<-2<CR>gv=gv", { desc = "Move up" })

-- jumplist
map("n", "<C-e>", "<C-i>", { desc = "Jumplist forward" })

-- smooth scroll
local commands = { "<C-U>", "<C-D>", "{", "}", "j", "k" }
local cinnamon = require("cinnamon")
cinnamon.setup()
for _, command in ipairs(commands) do
	map("n", command, function()
		cinnamon.scroll(command)
	end)
end

-- toggle supermaven
map("i", "<C-a>", function()
	local api = require("supermaven-nvim.api")
	api.toggle()
	require("notify")("Supermaven: " .. tostring(api.is_running()), "info", {
		render = "minimal",
		timeout = 100,
		stages = "fade",
	})
	vim.api.nvim_feedkeys(vim.api.nvim_replace_termcodes("<C-d>", true, false, true), "i", false)
end, { desc = "Autocomplete Toggle" })
map("n", "<C-a>", function()
	local api = require("supermaven-nvim.api")
	api.toggle()
	require("notify")("Supermaven: " .. tostring(api.is_running()), "info", {
		render = "minimal",
		timeout = 100,
		stages = "fade",
	})
end, { desc = "Autocomplete Toggle" })

-- LSP
map("n", "K", ":lua vim.lsp.buf.hover()<CR>", { desc = "Hover" })
map("n", "<leader>d", ":lua vim.diagnostic.open_float()<CR>", { desc = "Open diagnostics float" })
map("n", "gd", ":lua vim.lsp.buf.definition()<CR>", { desc = "Go to definition" })

map("n", "<leader>a", ":lua vim.lsp.buf.code_action()<CR>", { desc = "Code action" })
map("n", "<leader>r", function()
	local original_input = vim.ui.input
	vim.ui.input = function(opts, on_confirm)
		opts.default = "" -- Clear the default input
		original_input(opts, on_confirm)
	end
	vim.lsp.buf.rename()
end, { desc = "Rename symbol" })

map("i", "<C-d>", function()
	require("blink.cmp").hide()
	local cp = require("supermaven-nvim.completion_preview")
	if cp.ns_id then
		vim.api.nvim_buf_clear_namespace(0, cp.ns_id, 0, -1)
	end
end, { desc = "Hide Blink and clear Supermaven suggestion" })

-- teriminal mode
map("t", "<Esc>", [[<C-\><C-n>]], { desc = "Escape terminal mode" })
vim.api.nvim_create_autocmd({ "TermEnter", "TermLeave" }, {
	callback = function(ev)
		local buf = ev.buf
		if vim.bo[buf].buftype == "terminal" then
			if ev.event == "TermLeave" then
				-- entering normal mode
				vim.wo.number = true
				vim.wo.relativenumber = true
			else
				-- entering insert/terminal mode
				vim.wo.number = false
				vim.wo.relativenumber = false
			end
		end
	end,
})

-- close matching whatever
-- surround
-- diffview file history
