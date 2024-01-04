local lspconfig = require('lspconfig')

local capabilities = require('cmp_nvim_lsp').default_capabilities()

lspconfig.tsserver.setup({ capabilities = capabilities })
lspconfig.astro.setup({ capabilities = capabilities })
lspconfig.tailwindcss.setup({ capabilities = capabilities })
lspconfig.cssls.setup({ capabilities = capabilities })
lspconfig.rust_analyzer.setup({ capabilities = capabilities })

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

local function get_python_path()
  -- Use activated virtualenv.
  if vim.env.VIRTUAL_ENV then
    return path.join(vim.env.VIRTUAL_ENV, 'bin', 'python')
  end
  return exepath('python3') or exepath('python') or 'python'
end

lspconfig.pyright.setup({
  capabilities = capabilities,
  before_init = function(_, config)
    config.settings.python.pythonPath = get_python_path()
  end,
  settings = {
    python = {
      analysis = {
        typeCheckingMode = "off"
      }
    }
  }
})


lspconfig.jsonls.setup({
  capabilities = capabilities,
  settings = {
    json = {
      schemas = require('schemastore').json.schemas(),
      validate = { enable = true },
    }
  }
})
