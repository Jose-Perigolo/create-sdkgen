

import { cmp, each, camelify, File, Content, Copy, Folder } from '@voxgig/sdkgen'


import { MainEntity } from './MainEntity_js'
import { Test } from './Test_js'


const Main = cmp(async function Main(props: any) {
  const { build } = props
  const { model } = props.ctx$

  const entity = model.main.sdk.entity

  Copy({ from: 'tm/' + build.name + '/package.json', name: 'package.json' })

  Test({ build })

  Folder({ name: 'src' }, () => {

    File({ name: model.Name + 'SDK.' + build.name }, () => {

      Content(`
// ${model.Name} ${build.Name} SDK
`)

      each(entity, (entity: any) => {
        entity.Name = camelify(entity.name)
        Content(`
const { ${entity.Name} } = require('./${entity.Name}')
`)
      })


      const validate_options = each(build.options)
        .reduce((a: string, opt: any) =>
          a + ('String' === opt.kind ?
            `    required('string','${opt.name}',options)\n` : ''), '')


      Content(`
    
class ${model.Name}SDK {
  options

  static make(options) {
    return new ${model.Name}SDK(options)
  }


  constructor(options) {
    this.options = options

${validate_options}

    this.options.fetch = this.options.fetch || fetch 
  }


  endpoint(op,ent) {
    let data = ent.data || {}
    let def = ent.def
    // Make this code depend on openapi spec
    return this.options.endpoint + '/' + def.name + ((op === 'load' || op === 'remove') && data.id ? '/' + data.id : '')
  }

  method(op,ent) {
    let key = (null == ent || null === ent.id) && 'save' === op ? 'create' : op
    return ({
      create: 'POST',
      save: 'PUT',
      load: 'GET',
      list: 'GET',
      remove: 'DELETE',
    })[op]
  }

  body(op,ent) {
    const msg = { ...ent.data }  
    return JSON.stringify(msg)
  }

  fetchSpec(op,ent) {
    const method = this.method(op, ent)
    const spec = {
      url: this.endpoint(op, ent),
      method,
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer '+this.options.apikey
      },
      body: 'GET' === method || 'DELETE' === method ? undefined : this.body(op, ent),
    }
    return spec
  }

`)

      each(entity, (entity: any) => {
        MainEntity({ model, build, entity })
      })

      Content(`
}


function required(type,name,options) {
  const val = options[name]
  if(type !== typeof val) {
    throw new Error('${model.Name}SDK: Invalid option: '+name+'='+val+': must be of type '+type)
  }
}

module.exports = {
  ${model.Name}SDK
}

`)

    })
  })
})


export {
  Main
}
