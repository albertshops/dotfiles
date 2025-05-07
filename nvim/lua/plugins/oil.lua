return {
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
}
