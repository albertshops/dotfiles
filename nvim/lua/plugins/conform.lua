return {
	"stevearc/conform.nvim",
	opts = {
		formatters_by_ft = {
			lua = { "stylua" },
			-- python = { "black" },
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
			lsp_fallback = false,
			async = false,
			timeout_ms = 500,
		},
	},
}
