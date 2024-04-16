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
  vim.cmd("echo expand('%:p')")
end

function HarpoonPrev()
  local list = harpoon:list()
  list._index = list._index - 1
  if list._index < 1 then
    list._index = #list.items
  end
  list:select(list._index)
  vim.cmd("echo expand('%:p')")
end

vim.g.mapleader = " "
vim.g.maplocalleader = " "
vim.keymap.set("n", "<Backspace>o", function() harpoon.ui:toggle_quick_menu(harpoon:list()) end)
vim.keymap.set("n", "<Backspace>a", function() harpoon:list():append() end)
vim.keymap.set("n", "L", HarpoonNext)
vim.keymap.set("n", "H", HarpoonPrev)
