return {
	"neovim/nvim-lspconfig",
	dependencies = {
		"williamboman/mason.nvim",
		"williamboman/mason-lspconfig.nvim",
		"hrsh7th/cmp-nvim-lsp",
	},
	config = function()
		local capabilities = vim.lsp.protocol.make_client_capabilities()
		capabilities = vim.tbl_deep_extend("force", capabilities, require("cmp_nvim_lsp").default_capabilities())

		local servers = {
			clangd = {},
			tailwindcss = {},
			rust_analyzer = {},
			gopls = {},
			astro = {},

			ts_ls = {
				on_attach = function(client, bufnr)
					require("workspace-diagnostics").populate_workspace_diagnostics(client, bufnr)
				end,
			},

			pyright = {
				on_attach = function(client)
					if vim.env.VIRTUAL_ENV then
						client.config.settings.python.pythonPath = vim.env.VIRTUAL_ENV .. "/bin/python"
					end
				end,
				settings = {
					pyright = {
						disableOrganizeImports = true,
					},
					python = {
						analysis = {
							ignore = { "*" },
							typeCheckingMode = "off",
						},
					},
				},
			},

			ruff = {},

			lua_ls = {
				settings = {
					Lua = {
						diagnostics = {
							globals = { "vim", "hs" },
						},
						workspace = {
							library = "/Users/albertshops/.hammerspoon/Spoons/EmmyLua.spoon/annotations",
						},
					},
				},
			},

			jsonls = {
				settings = {
					json = {
						schemas = require("schemastore").json.schemas(),
						validate = { enable = true },
					},
				},
			},
		}

		require("mason").setup()
		require("mason-lspconfig").setup({
			handlers = {
				function(server_name)
					local server = servers[server_name]
					if server == nil then
						return
					end
					server.capabilities = vim.tbl_deep_extend("force", {}, capabilities, server.capabilities or {})
					require("lspconfig")[server_name].setup(server)
				end,
			},
		})

		-- HOVER
		vim.lsp.handlers["textDocument/hover"] = vim.lsp.with(vim.lsp.handlers.hover, {
			border = {
				{ "╭", "FloatBorder" },
				{ "─", "FloatBorder" },
				{ "╮", "FloatBorder" },
				{ "│", "FloatBorder" },
				{ "╯", "FloatBorder" },
				{ "─", "FloatBorder" },
				{ "╰", "FloatBorder" },
				{ "│", "FloatBorder" },
			},
		})

		-- DIAGNOSTICS
		vim.diagnostic.config({
			update_in_insert = true,
			virtual_text = false,
			float = { border = "rounded" },
		})

		-- SIGNS
		for type, icon in pairs({
			DiagnosticSignError = "",
			DiagnosticSignWarn = "",
			DiagnosticSignHint = "",
			DiagnosticSignInfo = "",
		}) do
			vim.fn.sign_define(type, { text = icon, texthl = type, numhl = type })
		end
	end,
}
