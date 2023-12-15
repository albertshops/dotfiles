local harpoon = require("harpoon")

harpoon:setup({
  settings = {
    save_on_toggle = true,
  }
})

vim.g.mapleader = " "
vim.g.maplocalleader = " "
vim.keymap.set("n", "<leader>o", function() harpoon.ui:toggle_quick_menu(harpoon:list()) end)
vim.keymap.set("n", "<leader>a", function() harpoon:list():append() end)
vim.keymap.set("n", "<leader>l", function() harpoon:list():next() end)
vim.keymap.set("n", "<leader>h", function() harpoon:list():prev() end)
