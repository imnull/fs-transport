const DEF_START_REG = /\/\/+\s*\#\s*ifdef\s+([_a-zA-Z]\w*)/
const DEF_N_START_REG = /\/\/+\s*\#\s*ifndef\s+([_a-zA-Z]\w*)/
const DEF_END_REG = /\/\/+\s*\#\s*endif/
const DEF_VAR_REG = /\$([A-Z0-9]+)\$/i
const IS_COMMENT = /^\s*\/\/+\s*/
const LINE_BREAK = '\n'

const checkVar = (line: string, params: Record<string, any>) => {
    if (!IS_COMMENT.test(line)) {
        return false
    }

    const m = line.match(DEF_VAR_REG)
    return m && m[1] && m[1] in params
}

const replaceVar = (code: string, params: Record<string, any>) => {
    const lines = code.split(LINE_BREAK).map(line => {
        if (checkVar(line, params)) {
            line = line.replace(DEF_VAR_REG, (m, $1) => {
                if (typeof params[$1] === 'undefined') {
                    return 'void(0)'
                } else {
                    return JSON.stringify(params[$1])
                }
            }).replace(IS_COMMENT, '')
        }
        return line
    })
    return lines.join(LINE_BREAK)
}

export const checkDef = (code: string, params: Record<string, any>): string => {
    code = replaceVar(code, params)
    const lines = code.split(LINE_BREAK)
    let isN = false, N = '', startLine = lines.findIndex(line => {
        const m = line.match(DEF_START_REG)
        const n = line.match(DEF_N_START_REG)
        if (m) {
            N = m[1]
            return true
        } else if (n) {
            N = n[1]
            isN = true
            return true
        } else {
            return false
        }
    })
    if (startLine > -1 && N) {
        let i = startLine + 1, endLine = -1
        for (; i < lines.length; i += 1) {
            const line = lines[i]
            if (DEF_END_REG.test(line)) {
                endLine = i
                break
            }
        }
        // 没有 endif
        if (endLine < 0) {
            return code
        }
        let part = lines.splice(startLine, endLine + 1 - startLine)
        let indent = 0
        const head = part[1]
        if (head && typeof head === 'string' && /^\s+$/.test(head)) {
            indent = head.length
            part = part.slice(1)
        }
        part = part.map(line => {
            return ' '.repeat(indent) + line.replace(/^(\s*)\/\/\s*/, '')
        })
        if ((!isN && params[N]) || (isN && !params[N])) {
            lines.splice(startLine, 0, ...part.slice(1, part.length - 1))
        }
        return checkDef(lines.join(LINE_BREAK), params)
    } else {
        return code
    }
}


const code = `var a = 1, _var = 0
// _var = $VAR$
`

console.log(checkDef(code, { VAR: void(0) }))
console.log(checkDef(code, { VAR: null }))
console.log(checkDef(code, { VAR: '3' }))
console.log(checkDef(code, { VAR: 4 }))
console.log(checkDef(code, { VAR: { a: 1, b:[1] } }))