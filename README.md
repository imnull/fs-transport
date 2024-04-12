# fs-transport

# TransTask

```ts
import path from 'path'
import { TransDir, TransTask, rmdir } from '@imnull/fs-transport'

new TransTask().addTask({
    description: 'some task 1',
    sourceDir: path.resolve(__dirname, './demo/from'),
    targetDir: path.resolve(__dirname, './demo/to'),
    // only trans the files.
    // relative pathes.
    // fullpath should be `${sourceDir}/${files[index]}`
    files: [
        '1.txt',
        '2/2.js'
    ]
}, {
    description: 'some task 2',
    sourceDir: path.resolve(__dirname, './demo/from'),
    targetDir: path.resolve(__dirname, './demo/to'),
    // clean up target dir before trans
    clearTargetDir: true,
})
// some resolver for some files.
// just like rule of webpapck config
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
.exec()

```

# TransDir

```ts
import path from 'path'
import { TransDir, TransTask, rmdir } from '@imnull/fs-transport'

const source = path.resolve(__dirname, './demo/from')
const target = path.resolve(__dirname, './demo/to')

// clean up target dir manually
rmdir(target)

new TransDir(source)
// define env
.define({ someEnv: true })
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
```

# Env

A script file content like this: 
```ts
let a: 'a' | 'b' = 'a'
// #ifdef B
// a = 'b'
// #endif
export default a
```

So if we set:
```ts
new TransDir(source)
// define env
.define({ B: true })
// ...
.output(targetDirB)
```

The file should be like:
```ts
let a: 'a' | 'b' = 'a'
a = 'b'
export default a
```

That's it.