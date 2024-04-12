import path from 'path'
import { TransDir, TransTask, rmdir } from './src'

const source = path.resolve(__dirname, './demo/from')
const target = path.resolve(__dirname, './demo/to')

rmdir(target)

new TransDir(source)
.define({ mainApp: true })
.pipe({
    test: /\.txt$/,
    resolve: (item, env) => {
        return {
            ...item,
            rename: item.name.replace(/\.ts$/, '.js'),
            content: Buffer.from('abc', 'utf-8')
        }
    }
})
.ignore(/\/node_modules\//)
.ignore(/\.d\.ts$/)
.output(target)

rmdir(target)

const tasks = new TransTask()
tasks.addTask({
    description: '任务1',
    sourceDir: source,
    targetDir: target,
    files: [
        '1.txt',
        '2/2.js'
    ]
})
.exec()