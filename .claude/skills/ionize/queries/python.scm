; Python capture vocabulary (shared shape across languages)

(class_definition
  name: (identifier) @name.class) @definition.class

(function_definition
  name: (identifier) @name.function) @definition.function

(import_statement
  name: (dotted_name) @import.source) @import

(import_from_statement
  module_name: (dotted_name) @import.source) @import

(call
  function: [
    (identifier) @call.name
    (attribute attribute: (identifier) @call.name)
  ]) @call

(comment) @comment
