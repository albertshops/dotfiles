local map = vim.keymap.set

map("", "<Space>", "<Nop>")

-- Telescope
map("n", "<Tab>t", ":Telescope<CR>", { desc = "Telescope" })
map("n", "<Tab>o", ":Telescope oldfiles<CR>", { desc = "Telescope oldfiles" })
map("n", "<Tab>b", ":Telescope buffers<CR>", { desc = "Telescope buffers" })
map("n", "<Tab>f", ":Telescope find_files<CR>", { desc = "Telescope find file" })
map("n", "<Tab>s", ":Telescope live_grep<CR>", { desc = "Telescope search string" })
map("n", "<Tab>m", ":Telescope marks<CR>", { desc = "Telescope marks" })
map("n", "<Tab>r", ":Telescope registers<CR>", { desc = "Telescope registers" })
map("n", "<Tab>c", ":Telescope quickfix<CR>", { desc = "Telescope quickfix" })
map("n", "<Tab>d", ":Telescope diagnostics<CR>", { desc = "Telescope diagnostics" })
map("n", "<Tab><space>", ":Telescope resume<CR>", { desc = "Telescope resume" })

-- LSP
map("n", "K", ":lua vim.lsp.buf.hover()<CR>", { desc = "Hover" })
map("n", "<leader>d", ":lua vim.diagnostic.open_float()<CR>", { desc = "Open diagnostics float" })
map("n", "gd", ":lua vim.lsp.buf.definition()<CR>", { desc = "Go to definition" })

-- code actions
map("n", "<leader>i", ":lua vim.lsp.buf.code_action()<CR>", { desc = "Code action" })

-- toggle chat
map("n", "<leader>a", ":AvanteToggle<CR>", { desc = "Toggle chat" })

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

-- supermaven
map("i", "<C-t>", function()
  local api = require("supermaven-nvim.api")
  api.toggle()
  require("notify")(
    "Supermaven: " .. tostring(api.is_running()),
    "info",
    {
      render = "minimal",
      timeout = 100,
      stages = "fade",
    }
  )
  vim.api.nvim_feedkeys(vim.api.nvim_replace_termcodes("<C-d>", true, false, true), "i", false)
end, { desc = "Supermaven Toggle" })
map("n", "<C-t>", function()
  local api = require("supermaven-nvim.api")
  api.toggle()
  print("Supermaven: " .. tostring(api.is_running()))
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
