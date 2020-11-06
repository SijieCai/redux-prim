function getType(x: any): string {
  return Object.prototype.toString.call(x).replace('object ', '');
}
type Dictionary = { [key: string]: any }
type PrimMeta<T> = { isPrimAction: boolean, namespace: string, updaterName: keyof PrimUpdaterImpls<T> };
type PrimAction<T> = { type: string, payload: any, meta?: PrimMeta<T>, error?: any }

interface UpdateParam<T extends Dictionary> {
  state: T,
  getDefaultState: Function,
  action: PrimAction<T>
}
interface PrimUpdaterImpls<T extends Dictionary> {
  initState: (p: UpdateParam<T>) => Dictionary,
  setState: (p: UpdateParam<T>) => Dictionary,
  mergeState: (p: UpdateParam<T>) => Dictionary
}
interface PrimUpdaters<T extends Dictionary> {
  initState: (p: Dictionary) => PrimAction<T>,
  setState: (p: Dictionary | ((s: T) => Dictionary)) => PrimAction<T>,
  mergeState: (p: Dictionary) => PrimAction<T>
}
var _actionTypePrefix = '@prim'

function stringify(x: any) {
  var type = getType(x);
  if (['[Number]', '[Boolean]', '[Undefined]'].indexOf(type) > 0) {
    return x
  }
  return type
}

function querify(payload: Dictionary) {
  var payloadStr = stringify(payload)
  if (payloadStr === '[Object]') {
    return Object.keys(payload)
      .map(key => `${key}=${stringify(payload[key])}`)
      .join('&')
  }

  return payloadStr
}

function updaterActionCreators<T>(namespace: string): PrimUpdaters<T> {
  function getMeta(updaterName: keyof PrimUpdaterImpls<T>): PrimMeta<T> {
    return {
      isPrimAction: true,
      namespace,
      updaterName
    }
  }
  var ns = namespace

  function updaterActionCreator(updaterName: keyof PrimUpdaterImpls<T>) {
    return function (payload: Dictionary | ((state: T) => Dictionary)): PrimAction<T> {
      return {
        type: `${_actionTypePrefix}/${ns}/${updaterName}/?${querify(payload)}`,
        payload,
        meta: getMeta(updaterName)
      }
    }
  }

  return {
    initState: updaterActionCreator('initState'),
    setState: function (payload: Dictionary | ((state: T) => Dictionary)): PrimAction<T> {
      return {
        type: `${_actionTypePrefix}/${ns}/${'setState'}/?${querify(payload)}`,
        payload,
        meta: getMeta('setState')
      }
    },
    mergeState: updaterActionCreator('mergeState')
  }
}


function isMatchedAction<T>(action: PrimAction<T>, namespace: string) {
  var meta = action.meta
  if (!meta || Object.prototype.toString.call(meta) !== '[object Object]') {
    return false
  }
  return meta.isPrimAction && meta.namespace === namespace
}

export function createPrimActions<T extends { [key: string]: (...args: any) => any }, P extends Dictionary>(
  namespace: string,
  getDefaultState: () => P,
  creator: (updaters: PrimUpdaters<P>) => T
) {
  if (typeof creator !== 'function') {
    throw new Error('Expected the creator to be a function.');
  }

  const actions = creator(updaterActionCreators<P>(namespace));

  const reducer = (state: P = getDefaultState(), action: PrimAction<P>): any => {
    if (!isMatchedAction(action, namespace)) return state

    var { updaterName } = action.meta

    const _updaters: PrimUpdaterImpls<P> = {
      initState({ action, getDefaultState }) {
        return Object.assign({}, getDefaultState(), action.payload);
      },
      setState({ state, action }) {
        if (typeof action.payload === 'function') {
          let reducer = action.payload as ((s: T) => Dictionary);
          return reducer(state);
        }
        return Object.assign({}, state, action.payload);
      },
      mergeState({ state, action }) {
        const payload = action.payload
        return Object.keys(payload).reduce(function (s, key: string) {
          if (getType(s[key]) === '[Object]' && getType(payload[key]) === '[Object]') {
            s[key] = Object.assign({}, s[key], payload[key])
          } else {
            s[key] = payload[key]
          }
          return s
        }, Object.assign({}, state))
      }
    }
    if (updaterName) {
      return _updaters[updaterName]({
        state,
        action,
        getDefaultState
      })
    }
    if (!reducer) {
      throw new Error(
        `reducer function is not defined in createPrimReducer("${namespace}", getDefaultState, reducer)`
      )
    }
  }
  return { actions, reducer };
}

var todoActions = createPrimActions('todo',
  () => ({
    value1: '',
    value2: 123,
    value3: []
  }),
  ({ setState }) => {
    return {
      complexAction(data: Dictionary) {
        return setState(state => ({ ...state }))
      }
    }
  }
);

console.log(todoActions);