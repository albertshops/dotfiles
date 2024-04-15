local harpoon = require("harpoon")

harpoon:setup({
  settings = {
    save_on_toggle = true,
  }
})

function HarpoonNext()
  local list = harpoon:list()
  list._index = list._index + 1
  if list._index > #list.items then
    list._index = 1
  end
  list:select(list._index)
end

function HarpoonPrev()
  local list = harpoon:list()
  list._index = list._index - 1
  if list._index < 1 then
    list._index = #list.items
  end
  list:select(list._index)
end

vim.g.mapleader = " "
vim.g.maplocalleader = " "
vim.keymap.set("n", "<leader>ho", function() harpoon.ui:toggle_quick_menu(harpoon:list()) end)
vim.keymap.set("n", "<leader>ha", function() harpoon:list():append() end)
vim.keymap.set("n", "<leader>hn", HarpoonNext)
vim.keymap.set("n", "<leader>hp", HarpoonPrev)
