return {
	"declancm/cinnamon.nvim",
	version = "*", -- use latest release
	opts = {
		-- Enable all provided keymaps
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
}
