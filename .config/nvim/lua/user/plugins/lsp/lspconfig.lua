local lspconfig = require('lspconfig')

local capabilities = require('cmp_nvim_lsp').default_capabilities()

lspconfig.jedi_language_server.setup({ capabilities = capabilities })
lspconfig.tsserver.setup({ capabilities = capabilities })
lspconfig.astro.setup({ capabilities = capabilities })
lspconfig.tailwindcss.setup({ capabilities = capabilities })
-- lspconfig.cssls.setup({ capabilities = capabilities })
lspconfig.rust_analyzer.setup({ capabilities = capabilities })
lspconfig.gopls.setup({ capabilities = capabilities })

lspconfig.lua_ls.setup({
  capabilities = capabilities,
  settings = {
    Lua = {
      diagnostics = {
        globals = { 'vim', 'path', 'exepath' }
      }
    }
  }
})

--[[
lspconfig.pyright.setup({
  capabilities = capabilities,
  before_init = function(_, config)
    if vim.env.VIRTUAL_ENV then
      config.settings.python.pythonPath = path.join(vim.env.VIRTUAL_ENV, 'bin', 'python')
    else
      config.settings.python.pythonPath = exepath('python3') or exepath('python') or 'python'
    end
  end,
  settings = {
    python = {
      analysis = {
        typeCheckingMode = "off"
      }
    }
  }
})
--]]


lspconfig.jsonls.setup({
  capabilities = capabilities,
  settings = {
    json = {
      schemas = require('schemastore').json.schemas(),
      validate = { enable = true },
    }
  }
})
