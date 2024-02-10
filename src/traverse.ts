import fs from 'fs'
import path from 'path'

type TTraverseItem = {
    absolutePath: string;
    dir: string;
    name: string;
}

type TTransItem = TTraverseItem & {
    content: Buffer;
    rename?: string;
}

type TTransPipe = {
    test: RegExp | ((item: TTraverseItem) => boolean);
    rename?: string;
    resolve: ((file: TTransItem) => TTransItem)
}

const testPass = (pipe: TTransPipe, item: TTransItem) => {
    if (pipe.test instanceof RegExp) {
        return pipe.test.test(item.absolutePath)
    } else {
        return pipe.test(item)
    }
}

type TRule = RegExp | ((str: string) => boolean)

const testRule = (rule: TRule, str: string) => {
    if(typeof rule === 'function') {
        return rule(str)
    } else {
        return rule.test(str)
    }
}

export const traverse = (absolutePath: string, callback: (item: TTraverseItem) => void, options: {
    ignores?: TRule[]
} = {}) => {

    const { ignores = [] } = options
    if(ignores.some(rule => testRule(rule, absolutePath))) {
        return
    }

    if (!fs.existsSync(absolutePath)) {
        return
    }
    const stat = fs.statSync(absolutePath)
    if (stat.isDirectory()) {
        const names = fs.readdirSync(absolutePath).filter(n => !/^\./.test(n))
        names.forEach(name => {
            const p = path.join(absolutePath, name)
            traverse(p, callback, options)
        })
    } else if (stat.isFile()) {
        const name = path.basename(absolutePath)
        const dir = path.dirname(absolutePath)
        callback({
            absolutePath,
            name,
            dir,
        })
    }
}

export const rmdir = (p: string) => {
    if(!fs.existsSync(p)) {
        return
    }
    const stat = fs.statSync(p)
    if(stat.isDirectory()) {
        const names = fs.readdirSync(p).filter(n => n !== '.' && n !== '..')
        names.forEach(n => {
            const full = path.join(p, n)
            rmdir(full)
        })
        fs.rmdirSync(p)
    } else if(stat.isFile()) {
        fs.unlinkSync(p)
    }
}



const saveItem = (item: TTransItem, source: string, target: string) => {
    const { content, name, dir, rename } = item
    const sourceFull = path.join(dir, name)
    const relativePath = path.relative(source, sourceFull)
    const targetFull = path.join(target, relativePath)
    const targetDir = path.dirname(targetFull)
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
    }
    const finPath = path.resolve(targetDir, rename || name)
    fs.writeFileSync(finPath, content)

    console.log('>', sourceFull)
    console.log('<', finPath)
}


export class TransDir {
    private readonly source: string
    private readonly pipes: TTransPipe[]
    private readonly ignores: TRule[]

    constructor(source: string) {
        this.source = source
        this.pipes = []
        this.ignores = []
    }

    ignore(rule: TRule) {
        this.ignores.push(rule)
        return this
    }

    pipe(pipe: TTransPipe) {
        this.pipes.push(pipe)
        return this
    }

    output(target: string) {
        if (!target) {
            throw '请输入目标目录'
        }
        if (!fs.existsSync(target)) {
            fs.mkdirSync(target, { recursive: true })
        }
        if (!fs.statSync(target).isDirectory()) {
            throw '目标路径不是目录，请选个目录（文件夹）'
        }

        traverse(this.source, _item => {
            const item: TTransItem = { ..._item, content: fs.readFileSync(_item.absolutePath) }
            const pipes = this.pipes.filter(pipe => testPass(pipe, item))
            const newItem = pipes.reduce((item, pipe) => pipe.resolve(item), item)
            saveItem(newItem, this.source, target)
        }, {
            ignores: [...this.ignores]
        })
    }
}