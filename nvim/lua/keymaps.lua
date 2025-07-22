local map = vim.keymap.set

map("", "<Space>", "<Nop>")

-- Telescope
map("n", "<Tab>t", ":Telescope<CR>", { desc = "Telescope" })
map("n", "<Tab>o", ":Telescope oldfiles<CR>", { desc = "Telescope oldfiles" })
map("n", "<Tab>b", ":Telescope buffers<CR>", { desc = "Telescope buffers" })
map("n", "<Tab>/", ":Telescope current_buffer_fuzzy_find<CR>", { desc = "Telescope find" })
map("n", "<Tab>f", ":Telescope find_files<CR>", { desc = "Telescope search files" })
map("n", "<Tab>s", ":Telescope live_grep<CR>", { desc = "Telescope search string" })
map("n", "<Tab>m", ":Telescope marks<CR>", { desc = "Telescope marks" })
map("n", "<Tab>r", ":Telescope registers<CR>", { desc = "Telescope registers" })
map("n", "<Tab>c", ":Telescope quickfix<CR>", { desc = "Telescope quickfix" })
map("n", "<Tab>d", ":Telescope diagnostics<CR>", { desc = "Telescope diagnostics" })
map("n", "<Tab><space>", ":Telescope resume<CR>", { desc = "Telescope resume" })

-- Git
map("n", "<BS>n", ":GitConflictNextConflict", { desc = "Git next conflict" })
map("n", "<BS>p", ":GitConflictPrevConflict", { desc = "Git previous conflict" })
map("n", "<BS>o", ":GitConflictChooseOurs", { desc = "Git choose ours" })
map("n", "<BS>t", ":GitConflictChooseTheirs", { desc = "Git choose theirs" })

-- LSP
map("n", "K", ":lua vim.lsp.buf.hover()<CR>", { desc = "Hover" })
map("n", "<leader>d", ":lua vim.diagnostic.open_float()<CR>", { desc = "Open diagnostics float" })
map("n", "gd", ":lua vim.lsp.buf.definition()<CR>", { desc = "Go to definition" })

map("n", "<leader>i", ":lua vim.lsp.buf.code_action()<CR>", { desc = "Code action" })
map("n", "<leader>a", ":lua vim.lsp.buf.code_action()<CR>", { desc = "Code action" })
map("n", "<leader>r", function()
	local original_input = vim.ui.input
	vim.ui.input = function(opts, on_confirm)
		opts.default = "" -- Clear the default input
		original_input(opts, on_confirm)
	end
	vim.lsp.buf.rename()
end, { desc = "Rename symbol" })

-- toggle comments
map("n", "<leader>c", ":lua require('Comment.api').toggle.linewise.current()<CR>", { desc = "Toggle comment" })
map("v", "<leader>c", function()
	local api = require("Comment.api")
	local esc = vim.api.nvim_replace_termcodes("<ESC>", true, false, true)
	vim.api.nvim_feedkeys(esc, "nx", false)
	api.toggle.linewise(vim.fn.visualmode())
end, { desc = "Toggle comment" })

-- misc
map("n", "<leader>g", ":LazyGit<CR>", { desc = "LazyGit" })
map("n", "<leader>o", ":Oil<CR>", { desc = "Oil" })

-- terminal
map("n", "<leader>t", ":below split term://zsh<CR>a", { desc = "terminal" })
map("t", "<Esc>", "<C-\\><C-n>", { desc = "Terminal - normal mode" })

-- copy to clipboard
map("n", "<leader>y", '"+y', { desc = "Yank to clipboard" })
map("v", "<leader>y", '"+y', { desc = "Yank to clipboard" })

-- indent
map("v", "<", "<gv", { desc = "Indent" })
map("v", ">", ">gv", { desc = "Indent" })

-- move
map("v", "J", ":move '>+1<CR>gv=gv", { desc = "Move down" })
map("v", "K", ":move '<-2<CR>gv=gv", { desc = "Move up" })

-- jumplist
map("n", "<C-e>", "<C-i>", { desc = "Jumplist forward" })

-- open terminal
map("n", "<leader>t", function()
	local cwd = vim.fn.getcwd()
	local text_win = vim.api.nvim_get_current_win()

	vim.cmd("lcd %:p:h")
	vim.cmd("below split | terminal zsh")
	local term_win = vim.api.nvim_get_current_win()
	vim.api.nvim_set_current_win(text_win)
	vim.cmd("lcd " .. cwd)
	vim.api.nvim_set_current_win(term_win)
	vim.cmd("startinsert")
end, { desc = "Open terminal" })

-- toggle supermaven
map("i", "<C-t>", function()
	local api = require("supermaven-nvim.api")
	api.toggle()
	require("notify")("Supermaven: " .. tostring(api.is_running()), "info", {
		render = "minimal",
		timeout = 100,
		stages = "fade",
	})
	vim.api.nvim_feedkeys(vim.api.nvim_replace_termcodes("<C-d>", true, false, true), "i", false)
end, { desc = "Supermaven Toggle" })
map("n", "<C-t>", function()
	local api = require("supermaven-nvim.api")
	api.toggle()
	require("notify")("Supermaven: " .. tostring(api.is_running()), "info", {
		render = "minimal",
		timeout = 100,
		stages = "fade",
	})
end, { desc = "Supermaven Toggle" })

-- diffview file history
map("n", "<leader>h", function()
	local view = require("diffview.lib").get_current_view()
	if view then
		vim.cmd("DiffviewClose")
	else
		vim.cmd("DiffviewFileHistory %")
	end
end, { desc = "Toggle Diffview" })

-- surround
vim.keymap.set("v", "<leader>s", function()
	local tag = vim.fn.input("Enter tag: ")
	if tag == "" then
		return
	end

	local esc = vim.api.nvim_replace_termcodes("<Esc>", true, false, true)
	vim.api.nvim_feedkeys(esc, "x", false)

	local start_pos = vim.fn.getpos("'<")
	local end_pos = vim.fn.getpos("'>")
	local start_line = start_pos[2] - 1
	local start_col = start_pos[3] - 1
	local end_line = end_pos[2] - 1
	local end_col = end_pos[3]

	local lines = vim.api.nvim_buf_get_lines(0, start_line, end_line + 1, false)

	-- Clamp end_col to line length
	local end_line_text = lines[#lines]
	end_col = math.min(end_col, #end_line_text)

	lines[#lines] = end_line_text:sub(1, end_col)
	lines[1] = lines[1]:sub(start_col + 1)

	local selected_text = table.concat(lines, "\n"):gsub("^%s+", ""):gsub("%s+$", "")
	local wrapped = "<" .. tag .. ">" .. selected_text .. "</" .. tag .. ">"

	vim.api.nvim_buf_set_text(0, start_line, start_col, end_line, end_col, vim.split(wrapped, "\n"))

	-- Move cursor to just after opening tag
	local col_after_tag = start_col + #("<" .. tag)
	vim.api.nvim_win_set_cursor(0, { start_line + 1, col_after_tag })
	vim.cmd("startinsert")
end, { desc = "Wrap trimmed selection with XML tag and format" })

-- smooth scroll
local commands = { "<C-U>", "<C-D>", "{", "}", "j", "k" }
local cinnamon = require("cinnamon")
cinnamon.setup()
for _, command in ipairs(commands) do
	map("n", command, function()
		cinnamon.scroll(command)
	end)
end

map("i", "<C-w>", function()
	-- Get text of the current line
	local line = vim.api.nvim_get_current_line()
	-- Get cursor position
	local cursor_pos = vim.api.nvim_win_get_cursor(0)
	local col = cursor_pos[2]

	-- If we're at the beginning of the line, there's nothing to check
	if col == 0 then
		return ""
	end

	-- Map of opening brackets to their closing counterparts
	local brackets = {
		["("] = ")",
		["{"] = "}",
		["["] = "]",
	}

	-- Get the character before the cursor
	local char_before = string.sub(line, col, col)

	-- Check for brackets first
	if brackets[char_before] then
		return brackets[char_before] .. "<Left>"
	end

	-- Check for HTML tag
	if char_before == ">" then
		-- Look backward to find the opening '<'
		local tag_content = ""
		local i = col - 1

		-- Find the potential tag content
		while i > 0 do
			local c = line:sub(i, i)
			if c == "<" then
				tag_content = line:sub(i, col)
				break
			elseif c == ">" then
				-- Found another closing bracket before finding opening, not a valid tag
				break
			end
			i = i - 1
		end

		-- If we found what looks like a tag
		if tag_content ~= "" then
			-- Extract the tag name
			local tag_name = tag_content:match("^<([%w%-]+)")

			-- If it's a valid tag and not a self-closing tag
			if tag_name and not tag_content:match("/[%s]*>$") and not tag_content:match("^<%?") then
				-- Check if it's not a self-closing tag like <img>, <br>, <hr>, etc.
				local self_closing_tags = {
					img = true,
					br = true,
					hr = true,
					meta = true,
					link = true,
					input = true,
					area = true,
					base = true,
					col = true,
					embed = true,
					keygen = true,
					param = true,
					source = true,
					track = true,
					wbr = true,
				}

				if not self_closing_tags[tag_name:lower()] then
					return "</" .. tag_name .. ">" .. string.rep("<Left>", string.len(tag_name) + 3)
				end
			end
		end
	end

	-- If no match detected, return empty string
	return ""
end, { expr = true, desc = "Insert matching closing bracket/tag" })
