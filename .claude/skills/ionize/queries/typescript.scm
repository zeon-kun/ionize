; TypeScript / TSX capture vocabulary (shared shape across languages)

(class_declaration
  name: (type_identifier) @name.class) @definition.class

(abstract_class_declaration
  name: (type_identifier) @name.class) @definition.class

(function_declaration
  name: (identifier) @name.function) @definition.function

(method_definition
  name: (property_identifier) @name.function) @definition.method

(import_statement
  source: (string (string_fragment) @import.source)) @import

(call_expression
  function: [
    (identifier) @call.name
    (member_expression property: (property_identifier) @call.name)
  ]) @call

(comment) @comment
