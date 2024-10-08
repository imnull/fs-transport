import fs from 'fs'
import path from 'path'
import chalk from 'chalk'

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
    resolve: ((file: TTransItem, env: Record<string, boolean>) => TTransItem)
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
    if (typeof rule === 'function') {
        return rule(str)
    } else {
        return rule.test(str)
    }
}

export const traverse = (absolutePath: string, callback: (item: TTraverseItem) => void, options: {
    ignores?: TRule[]
} = {}) => {

    const { ignores = [] } = options
    if (ignores.some(rule => testRule(rule, absolutePath))) {
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
    if (!fs.existsSync(p)) {
        return
    }
    const stat = fs.statSync(p)
    if (stat.isDirectory()) {
        const names = fs.readdirSync(p).filter(n => n !== '.' && n !== '..')
        names.forEach(n => {
            const full = path.join(p, n)
            rmdir(full)
        })
        fs.rmdirSync(p)
    } else if (stat.isFile()) {
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

    console.log(chalk.blue('[<<] from'), chalk.blue(sourceFull))
    console.log(chalk.green('[>>]   to'), chalk.green(finPath))
}

export abstract class TransBase {
    protected readonly pipes: TTransPipe[]
    protected readonly ignores: TRule[]
    protected readonly env: Record<string, boolean>

    constructor() {
        this.pipes = []
        this.ignores = []
        this.env = {}
    }

    define(env: Record<string, any>) {
        Object.assign(this.env, env)
        return this
    }

    ignore(rule: TRule) {
        this.ignores.push(rule)
        return this
    }

    pipe(pipe: TTransPipe) {
        this.pipes.push(pipe)
        return this
    }

    protected writeTitle(title: string, width: number = 48) {
        // const width = 48
        // const title = `[TransTask] executing ${this.tasks.length} tasks ...`
        const tail = width - title.length - 6
        console.log('')
        console.log(chalk.gray('#'.repeat(width)))
        console.log(chalk.gray('#'), ' '.repeat(width - 4), chalk.gray('#'))
        console.log(chalk.gray('#'), ' '.repeat(Math.floor(tail / 2)), chalk.whiteBright(title), ' '.repeat(Math.ceil(tail / 2)), chalk.gray('#'))
        console.log(chalk.gray('#'), ' '.repeat(width - 4), chalk.gray('#'))
        console.log(chalk.gray('#'.repeat(width)))
        console.log('')
    }

    protected trans(sourceDir: string, targetDir: string, env: Record<string, boolean>, baseItem: TTraverseItem) {
        const item: TTransItem = { ...baseItem, content: fs.readFileSync(baseItem.absolutePath) }
        const pipes = this.pipes.filter(pipe => testPass(pipe, item))
        const newItem = pipes.reduce((item, pipe) => pipe.resolve(item, env), item)
        saveItem(newItem, sourceDir, targetDir)
    }
}


export class TransDir extends TransBase {
    private readonly source: string

    constructor(source: string) {
        super()
        this.source = source
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

        this.writeTitle(`[TransDir] outputting ...`)

        const env = { ...this.env }

        traverse(this.source, it => {
            this.trans(this.source, target, env, it)
        }, {
            ignores: [...this.ignores]
        })

        console.log('')
        console.log(chalk.green.bold('[TransDir] Done successfully!'))
        console.log('')
    }
}

type TTask = {
    sourceDir: string;
    targetDir: string;
    description: string;
    files?: string[];
    clearTargetDir?: boolean;
}

const getTaskItems = (task: TTask) => {
    const { sourceDir, targetDir, files, clearTargetDir = false } = task
    if (Array.isArray(files) && files.length > 0) {
        const items = files
            .map(file => path.join(sourceDir, file))
            .filter(file => fs.existsSync(file) && fs.statSync(file).isFile())
            .map(file => ({
                absolutePath: file,
                dir: path.dirname(file),
                name: path.basename(file),
            })) as TTraverseItem[]
        return { source: sourceDir, target: targetDir, clear: false, items }
    } else {
        const items: TTraverseItem[] = []
        traverse(sourceDir, item => {
            items.push(item)
        })
        return { source: sourceDir, target: targetDir, clear: clearTargetDir, items }
    }
}
export class TransTask extends TransBase {
    private readonly tasks: TTask[]
    constructor() {
        super()
        this.tasks = []
    }

    addTask(...tasks: TTask[]) {
        this.tasks.push(...tasks)
        return this
    }

    exec() {

        this.writeTitle(`[TransTask] executing ${this.tasks.length} tasks ...`)

        const env = { ...this.env }

        this.tasks.forEach((task, idx) => {
            const { items, source, target, clear } = getTaskItems(task)
            console.log(chalk.yellow.bold(`[task] ${idx + 1}/${this.tasks.length}`), chalk.yellow(task.description))
            if (clear) {
                console.log(chalk.redBright.bold('[CLEAN UP DIR]'), chalk.redBright(target))
                rmdir(target)
            }
            items.forEach(item => {
                this.trans(source, target, env, item)
            })
            console.log('')
        })
        console.log(chalk.green.bold('[TransTask] Done successfully!'))
        console.log('')
    }
}

export const quickTask = (config: {
    name: string;
    source: string;
    target: string;
    env?: Record<string, any>;
    tasks?: { source: string; desc?: string; target?: string; clear?: boolean; files?: string[] }[];
}) => {
    const { name, tasks = [], env = {}, source: SOURCE, target: TARGET } = config
    const finTasks: TTask[] = tasks.map(task => {
        const { source, desc = source, target = source, clear = false, files } = task
        const finTask: TTask = {
            description: `${name}: ${desc}`,
            sourceDir: path.resolve(SOURCE, source),
            targetDir: path.resolve(TARGET, target),
            clearTargetDir: clear,
        }
        if(Array.isArray(files)) {
            finTask.files = [...files]
        }
        return finTask
    })

    const task = new TransTask().addTask(...finTasks).define(env)
    return task

    // exports.initTrans(new TransTask().addTask(...finTasks), env).exec()
}