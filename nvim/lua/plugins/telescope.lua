return {
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
}
