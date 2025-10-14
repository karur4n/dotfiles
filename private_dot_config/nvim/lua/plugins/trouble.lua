return {
  "folke/trouble.nvim",
  opts = {
    modes = {
      symbols = {
        filter = {
          any = {
            kind = {
              "Class",
              "Constructor",
              "Enum",
              -- "Field",
              -- "Function",
              "Interface",
              "Method",
              "Module",
              "Namespace",
              "Package",
              -- "Property",
              "Struct",
              "Trait",
            },
          },
        },
      },
    },
  },
}
