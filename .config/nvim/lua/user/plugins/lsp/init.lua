require "user.plugins.lsp.lspconfig"
require("mason").setup()
require("mason-lspconfig").setup()


-- FORMAT ON SAVE
local null_ls = require("null-ls")
null_ls.setup({
  sources = {
    null_ls.builtins.formatting.prettierd,
  },
})

vim.api.nvim_create_augroup('format_on_save', { clear = true })
vim.api.nvim_create_autocmd("BufWritePre", {
  group = 'format_on_save',
  callback = function()
    vim.lsp.buf.format()
  end
})

-- HOVER
vim.lsp.handlers["textDocument/hover"] = vim.lsp.with(
  vim.lsp.handlers.hover, {
    border = {
      { "╭", "FloatBorder" },
      { "─", "FloatBorder" },
      { "╮", "FloatBorder" },
      { "│", "FloatBorder" },
      { "╯", "FloatBorder" },
      { "─", "FloatBorder" },
      { "╰", "FloatBorder" },
      { "│", "FloatBorder" },
    }
  }
)

-- DIAGNOSTICS
vim.diagnostic.config({
  update_in_insert = true,
  virtual_text = false,
  float = { border = "rounded" }
})


-- SIGNS
for type, icon in pairs({
  DiagnosticSignError = "",
  DiagnosticSignWarn = "",
  DiagnosticSignHint = "",
  DiagnosticSignInfo = ""
}) do
  vim.fn.sign_define(type, { text = icon, texthl = type, numhl = type })
end
