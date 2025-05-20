local autocmd = vim.api.nvim_create_autocmd
local augroup = vim.api.nvim_create_augroup

autocmd("TextYankPost", {
	desc = "Highlight when yanking (copying) text",
	group = augroup("highlight-yank", { clear = true }),
	callback = function()
		vim.highlight.on_yank()
	end,
})

autocmd("VimEnter", {
	desc = "Automatically update lazyvim plugins if needed",
	group = augroup("lazyvim-autoupdate", { clear = true }),
	callback = function()
		if require("lazy.status").has_updates then
			require("lazy").update({ show = false })
		end
	end,
})

autocmd("TermOpen", {
	group = augroup("term-open", { clear = true }),
	callback = function()
		vim.opt.number = false
		vim.opt.relativenumber = false
	end,
})

autocmd({ "FileType" }, {
	pattern = { "python" },
	callback = function()
		vim.b.disable_autoformat = true
	end,
})
