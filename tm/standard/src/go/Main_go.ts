
import { cmp, each, camelify, File, Code, Copy } from '@voxgig/sdkgen'

import { MainEntity } from './MainEntity_go'
import { Test } from './Test_go'

const Main_go = cmp(async function Main_go(props: any) {
  const { build } = props
  const { model } = props.ctx$

  const entity = model.main.sdk.entity
  const options = build.options

  Copy({ from: 'tm/' + build.name + '/.env.example', name: '.env.example' })
  Copy({ from: 'tm/' + build.name + '/go.mod', name: 'go.mod' })
  Copy({ from: 'tm/' + build.name + '/go.sum', name: 'go.sum' })
  Test({ build })
  File({ name: model.name + 'sdk.' + build.name }, () => {

    Code(`
// ${model.Name} ${build.Name} SDK

package ${model.name}

import(
  "bytes"
  "encoding/json"
  "fmt"
  "net/http"
)

type endpointConfig struct {
  op string
  id string
  name string
  apiUrl string
}

type fetchConfig struct {
  op string
  url string
  apikey string
}

type spec struct {
  body *bytes.Buffer
  url string
  method string
  contentType string
  authorization string
}

type Options struct {`)
    each(options, (option: any) => {
      if (option.kind != "Any") {
        Code(`
  ${camelify(option.name)} ${option.kind.toLowerCase()}
`)
      }
    }); Code(`
}

type ${model.name} struct {
  httpClient http.Client
  options Options
}

func method(op string) string {
  operations := map[string]string {
    "create": "POST",
    "save": "PUT",
    "load": "GET",
    "list": "GET",
    "remove": "DELETE",
  }

  return operations[op]
}

func endpoint(config endpointConfig) string {
  url := fmt.Sprintf("%v/%v", config.apiUrl, config.name)

  if config.op == "load" || config.op == "remove" {
    url += fmt.Sprintf("/%v", config.id)
  }

  return url
}

func body[T any](data T) ([]byte, error) {
  var msg []byte
  msg, err := json.Marshal(data)
  if err != nil {
    return nil, err
  }
  return msg, nil
}

func fetchSpec[T any](config fetchConfig, data T) (spec, error){
  method := method(config.op)
  buffBody := bytes.NewBuffer([]byte{})

  if method != "GET" && method != "DELETE" {
    parsedBody, err := body(data)
    if err != nil {
      return spec{}, err
    }
    buffBody = bytes.NewBuffer(parsedBody)
  }

  spec := spec{
    url: config.url,
    method: method,
    contentType: "application/json",
    authorization: fmt.Sprintf("Bearer %v", config.apikey),
    body: buffBody,
  }
  return spec, nil
}

`)

    each(entity, (entity: any) => {
      MainEntity({ model, build, entity })
    })

    Code(`
func NewClient(options Options) *${model.name} {
  sdk := new (${model.name})
  sdk.options = options
  sdk.httpClient = *http.DefaultClient
  return sdk
}
`)
  })
})


export {
  Main_go
}