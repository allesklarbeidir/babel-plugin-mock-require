# babel-plugin-mock-require

Replaces require with a call to a specified module which is supposed to return the required module or a mocked version of it.

Use the babel-plugin option "moduleMocker" to specify the module name, which's default export will be called with the original require-string.