-- http-local.lua
-- Agregar esto a tu init.lua o como plugin en ~/.config/nvim/lua/http-local.lua
--
-- Comandos disponibles:
--   :Http GET https://httpbin.org/get
--   :Http POST https://api.com/v1 '{"key":"val"}'
--   :HttpOpen   → abre el TUI interactivo en un split terminal
--   :HttpBuffer → hace request con el contenido del buffer actual como body

local M = {}

local SCRIPT = vim.fn.expand("~/.local/bin/http-local.py")

-- Abre el TUI en un split terminal
vim.api.nvim_create_user_command("HttpOpen", function()
  vim.cmd("split")
  vim.cmd("terminal python3 " .. SCRIPT)
  vim.cmd("startinsert")
end, { desc = "Abrir http-local TUI" })

-- Hace una request rápida y muestra resultado en un buffer
vim.api.nvim_create_user_command("Http", function(opts)
  local args = opts.args
  local cmd = string.format("python3 %s %s", SCRIPT, args)
  local result = vim.fn.systemlist(cmd)

  -- Abrir resultado en un split
  vim.cmd("botright 15new")
  local buf = vim.api.nvim_get_current_buf()
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, result)
  vim.bo[buf].modifiable = false
  vim.bo[buf].buftype = "nofile"
  vim.bo[buf].filetype = "json"
  vim.api.nvim_buf_set_name(buf, "http-response")

  -- Cerrar con q
  vim.keymap.set("n", "q", "<cmd>bd!<cr>", { buffer = buf, silent = true })
end, {
  nargs = "+",
  desc = "HTTP request: :Http GET https://... o :Http POST https://... '{json}'",
})

-- Usa el contenido del buffer como body del POST
vim.api.nvim_create_user_command("HttpBuffer", function(opts)
  local url = opts.args
  if url == "" then
    url = vim.fn.input("URL: ")
  end
  local lines = vim.api.nvim_buf_get_lines(0, 0, -1, false)
  local body = table.concat(lines, "\n")

  local tmpfile = vim.fn.tempname()
  vim.fn.writefile({ body }, tmpfile)

  local cmd = string.format(
    "python3 -c \"\nimport sys, json, urllib.request, time\nbody=open('%s').read()\nreq=urllib.request.Request('%s', body.encode(), {'Content-Type':'application/json'}, method='POST')\ntry:\n with urllib.request.urlopen(req) as r:\n  print(json.dumps(json.loads(r.read()),indent=2))\nexcept Exception as e:\n print(str(e))\n\"",
    tmpfile, url
  )

  local result = vim.fn.systemlist(cmd)
  vim.fn.delete(tmpfile)

  vim.cmd("botright 20new")
  local buf = vim.api.nvim_get_current_buf()
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, result)
  vim.bo[buf].modifiable = false
  vim.bo[buf].buftype = "nofile"
  vim.bo[buf].filetype = "json"
  vim.keymap.set("n", "q", "<cmd>bd!<cr>", { buffer = buf, silent = true })
end, {
  nargs = "?",
  desc = "POST el contenido del buffer actual como JSON",
})

-- Keymaps opcionales (descomenta los que quieras)
-- vim.keymap.set("n", "<leader>hr", "<cmd>HttpOpen<cr>",   { desc = "http-local: abrir TUI" })
-- vim.keymap.set("n", "<leader>hb", "<cmd>HttpBuffer<cr>", { desc = "http-local: POST buffer" })

return M

--[[
INSTALACIÓN RÁPIDA:

1. Copia http-local.py a algún lugar del PATH:
   cp http-local.py ~/.local/bin/http-local.py
   chmod +x ~/.local/bin/http-local.py

2. Agrega a tu init.lua:
   require("http-local")

3. Uso:
   :Http GET https://httpbin.org/get
   :Http POST https://httpbin.org/post '{"test":true}'
   :HttpOpen       → TUI interactivo
   :HttpBuffer     → POST el archivo que estás editando

ALTERNATIVA — usar solo desde terminal de neovim sin config:
   :terminal python3 ~/.local/bin/http-local.py
   :terminal python3 ~/.local/bin/http-local.py GET https://httpbin.org/get
--]]
