import { transpileModule, ScriptTarget, ModuleKind, JSDocParsingMode } from 'typescript'
import SASS from 'sass'
import fs from 'fs'

export const transTypeScriptFileForWeChat = (fileName: string) => {
    const code = fs.readFileSync(fileName, 'utf-8')
    const res = transpileModule(code, {
        fileName,
        compilerOptions: {
            target: ScriptTarget.ESNext,
            module: ModuleKind.ESNext,
        },
        jsDocParsingMode: JSDocParsingMode.ParseAll,
    })
    return res.outputText
}

export const transTypeScriptCodeForWeChat = (code: string) => {
    const res = transpileModule(code, {
        compilerOptions: {
            target: ScriptTarget.ESNext,
            module: ModuleKind.ESNext,
        },
        jsDocParsingMode: JSDocParsingMode.ParseAll,
    })
    return res.outputText
}

export const transSassFileForWeChat = (fileName: string) => {
    const res = SASS.compile(fileName, {})
    return res.css
}

export const transSassCodeForWeChat = (code: string) => {
    const res = SASS.compileString(code, {})
    return res.css
}