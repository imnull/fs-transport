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

# Var

As a placeholder, you can use `${key}$` to replace with value.

```ts
const code = `var a = 1, _var = 0
// _var = $VAR$
`
console.log(checkDef(code, { VAR: undefined }))
console.log(checkDef(code, { VAR: null }))
console.log(checkDef(code, { VAR: '3' }))
console.log(checkDef(code, { VAR: 4 }))
console.log(checkDef(code, { VAR: { a: 1, b:[1] } }))
```

Then result should be:

```
var a = 1, _var = 0
_var = void(0)

var a = 1, _var = 0
_var = null

var a = 1, _var = 0
_var = "3"

var a = 1, _var = 0
_var = 4

var a = 1, _var = 0
_var = {"a":1,"b":[1]}
```

That's it.