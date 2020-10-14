"use strict";
const path = require("path");

exports = module.exports = function({ types: t }) {
    return {
        visitor: {
            CallExpression:{
                exit(path, state){
                    const args = path.node.arguments || [];
                    
                    if(
                        path.node.callee.name === "require"
                    ){
                        if(
                            (
                                path.node.leadingComments &&
                                path.node.leadingComments.length &&
                                path.node.leadingComments.filter(
                                    c => c.type === "CommentBlock" && c.value === "@babel-plugin-mock-require ignore"
                                ).length > 0
                            ) ||
                            (
                                state.opts.ignoreModules && state.opts.ignoreModules.length &&
                                args.length === 1 &&
                                t.isStringLiteral(args[0]) &&
                                state.opts.ignoreModules.indexOf(args[0].value) !== -1
                            )
                        ){
                            path.skip();
                        }
                        else
                        {
                            path.replaceWith(
                                t.callExpression(
                                    t.memberExpression(
                                        t.callExpression(
                                            t.identifier("require"),
                                            [t.stringLiteral("babel-plugin-mock-require")]
                                        ),
                                        t.identifier("requireHook")
                                    ),
                                    [
                                        t.stringLiteral(JSON.stringify(state.opts)),
                                        t.identifier("__dirname"),
                                        t.functionExpression(
                                            null,
                                            [t.identifier("require")],
                                            t.blockStatement(
                                                [
                                                    t.returnStatement(t.callExpression(t.identifier("require"), path.node.arguments))
                                                ],
                                                []
                                            )
                                        )
                                    ]
                                )
                            );
                            path.skip();
                        }

                    }
                }
            }
        },
    };
}

let opts = null;
let moduleMocker = null;
exports.requireHook = function(_opts, from, requireCallback) {
    if(opts === null){
        opts = JSON.parse(_opts);
    }
    if(!opts.moduleMocker || !typeof(opts.moduleMocker) === "string"){
        throw new Error("Option 'moduleMocker' not specified. Please specify a module name.");
    }
    if(moduleMocker === null){
        moduleMocker = require(opts.moduleMocker);
        if(moduleMocker.__esModule && moduleMocker.default){
            moduleMocker = moduleMocker.default;
        }
    }

    const doRequire = function(){
        const str = arguments[0];
        if(str && str.length > 0 && [".", "/"].indexOf(str[0]) !== -1){
            return moduleMocker.apply(null, [path.resolve(from, str)].concat([...arguments].slice(1)));
        }
        return moduleMocker.apply(null, [str].concat([...arguments].slice(1)));
    };
    return requireCallback(doRequire);
};