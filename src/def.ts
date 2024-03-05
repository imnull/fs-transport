const DEF_START_REG = /\/\/+\s*\#\s*ifdef\s+([_a-zA-Z]\w*)/
const DEF_N_START_REG = /\/\/+\s*\#\s*ifndef\s+([_a-zA-Z]\w*)/
const DEF_END_REG = /\/\/+\s*\#\s*endif/
const LINE_BREAK = '\n'

export const checkDef = (code: string, params: Record<string, boolean>): string => {
    const lines = code.split(LINE_BREAK)
    let isN = false, N = '', startLine = lines.findIndex(line => {
        const m = line.match(DEF_START_REG)
        const n = line.match(DEF_N_START_REG)
        if(m) {
            N = m[1]
            return true
        } else if(n) {
            N = n[1]
            isN = true
            return true
        } else {
            return false
        }
    })
    if(startLine > -1 && N) {
        let i = startLine + 1, endLine = -1
        for(; i < lines.length; i += 1) {
            const line = lines[i]
            if(DEF_END_REG.test(line)) {
                endLine = i
                break
            }
        }
        // 没有 endif
        if(endLine < 0) {
            return code
        }
        const part = lines.splice(startLine, endLine + 1 - startLine)
        if((!isN && params[N]) || (isN && !params[N])) {
            lines.splice(startLine, 0, ...part.slice(1, part.length - 1))
        }
        return checkDef(lines.join(LINE_BREAK), params)
    } else {
        return code
    }
}


// console.log(checkDef(`var a = 1
// // #ifdef ABC
// a = 2
// // #endif
// var b = 2
// // #ifndef xyz
// b = 3
// // #endif

// `, { ABC: true, xyz: false }))